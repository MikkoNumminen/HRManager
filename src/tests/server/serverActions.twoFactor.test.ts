import { testPrisma, cleanDb } from "./testDb";

// Set encryption key before any imports that use it
process.env.TOTP_ENCRYPTION_KEY = "test-encryption-key-for-totp-at-least-32-chars";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging
jest.mock("@/auditLog", () => ({
  logAudit: jest.fn(),
  captureAuditContext: jest.fn().mockResolvedValue({
    userId: null,
    userEmail: null,
    sessionId: null,
  }),
  deferAudit: jest.fn(),
  deferAuditLog: jest.fn(),
}));

// Mock rate limiting
jest.mock("@/rateLimit", () => ({
  rateLimit: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests");
      this.name = "RateLimitError";
    }
  },
}));

// Mock demo session
jest.mock("@/demoSession", () => ({
  getDemoSessionId: jest.fn().mockResolvedValue(null),
}));

// Mock Next.js server functions
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  unstable_cache: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  verifyTwoFactorLogin,
  adminResetTwoFactor,
} from "@/serverActions";
import {
  generateTotpSecret,
  getTotpBase32,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/totpCrypto";

const { auth } = require("@/auth");

// Helper to build FormData
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("Two-Factor Authentication Server Actions", () => {
  let testUser: { id: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    testUser = await testPrisma.user.create({
      data: {
        email: "test2fa@example.com",
        name: "Test 2FA User",
        role: "user",
      },
    });
    auth.mockResolvedValue({
      user: { id: testUser.id, email: testUser.email },
    });
  });

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  describe("beginTwoFactorSetup", () => {
    // Should return a TOTP URI, secret, and recovery codes
    it("should generate setup data with URI, secret, and recovery codes", async () => {
      const result = await beginTwoFactorSetup();
      expect(result.uri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.recoveryCodes).toHaveLength(10);
    });

    // Should fail if 2FA is already enabled
    it("should throw if 2FA is already enabled", async () => {
      // Set up 2FA for the user first
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: true,
          recoveryCodes: [],
        },
      });

      await expect(beginTwoFactorSetup()).rejects.toThrow();
    });

    // Should fail if not authenticated
    it("should throw if not authenticated", async () => {
      auth.mockResolvedValue(null);
      await expect(beginTwoFactorSetup()).rejects.toThrow();
    });
  });

  describe("confirmTwoFactorSetup", () => {
    // Should enable 2FA when given a valid code
    it("should enable 2FA with a valid TOTP code", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const code = totp.generate();
      const recoveryCodes = generateRecoveryCodes();

      const result = await confirmTwoFactorSetup(
        formData({
          code,
          secret,
          recoveryCodes: JSON.stringify(recoveryCodes),
        }),
      );

      expect(result).toBeUndefined(); // success = undefined

      // Verify in DB
      const tfa = await testPrisma.twoFactorAuth.findUnique({
        where: { userId: testUser.id },
      });
      expect(tfa).not.toBeNull();
      expect(tfa!.enabled).toBe(true);
      expect(tfa!.recoveryCodes).toHaveLength(10);
    });

    // Should reject an invalid code
    it("should reject an invalid TOTP code", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);

      const result = await confirmTwoFactorSetup(
        formData({
          code: "999999",
          secret,
          recoveryCodes: JSON.stringify([]),
        }),
      );

      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });

    // Should reject a code that's too short
    it("should reject a code that is too short", async () => {
      const result = await confirmTwoFactorSetup(
        formData({
          code: "12",
          secret: "JBSWY3DPEHPK3PXP",
          recoveryCodes: JSON.stringify([]),
        }),
      );

      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });
  });

  describe("disableTwoFactor", () => {
    // Should disable 2FA when given a valid code
    it("should disable 2FA with a valid code", async () => {
      // Set up 2FA first
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const codes = generateRecoveryCodes();
      const { encryptSecret } = require("@/lib/totpCrypto");

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: codes.map(hashRecoveryCode),
        },
      });

      const code = totp.generate();
      const result = await disableTwoFactor(formData({ code }));
      expect(result).toBeUndefined();

      // Verify removal from DB
      const tfa = await testPrisma.twoFactorAuth.findUnique({
        where: { userId: testUser.id },
      });
      expect(tfa).toBeNull();
    });

    // Should reject an invalid code
    it("should reject an invalid code when disabling", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const { encryptSecret } = require("@/lib/totpCrypto");

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: [],
        },
      });

      const result = await disableTwoFactor(formData({ code: "000000" }));
      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });

    // Should fail if 2FA is not enabled
    it("should fail if 2FA is not enabled", async () => {
      const result = await disableTwoFactor(formData({ code: "123456" }));
      expect(result).toBeDefined();
      expect(result?.code).toBe("twoFactorNotEnabled");
    });
  });

  describe("verifyTwoFactorLogin", () => {
    // Should verify a valid TOTP code during login
    it("should accept a valid TOTP code", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const { encryptSecret } = require("@/lib/totpCrypto");

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: [],
        },
      });

      const code = totp.generate();
      const result = await verifyTwoFactorLogin(formData({ code }));
      expect(result).toBeUndefined();
    });

    // Should accept a valid recovery code
    it("should accept a valid recovery code and remove it", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const codes = generateRecoveryCodes();
      const { encryptSecret } = require("@/lib/totpCrypto");

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: codes.map(hashRecoveryCode),
        },
      });

      // Use the first recovery code
      const result = await verifyTwoFactorLogin(formData({ code: codes[0] }));
      expect(result).toBeUndefined();

      // Verify the used code was removed
      const tfa = await testPrisma.twoFactorAuth.findUnique({
        where: { userId: testUser.id },
      });
      expect(tfa!.recoveryCodes).toHaveLength(9);
    });

    // Should reject an invalid code
    it("should reject an invalid code", async () => {
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const { encryptSecret } = require("@/lib/totpCrypto");

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: [],
        },
      });

      const result = await verifyTwoFactorLogin(formData({ code: "000000" }));
      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });
  });

  describe("adminResetTwoFactor", () => {
    // Admin should be able to reset a user's 2FA
    it("should delete a user's 2FA record", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: true,
          recoveryCodes: [],
        },
      });

      const result = await adminResetTwoFactor(formData({ userId: testUser.id }));
      expect(result).toBeUndefined();

      // Verify deletion
      const tfa = await testPrisma.twoFactorAuth.findUnique({
        where: { userId: testUser.id },
      });
      expect(tfa).toBeNull();
    });

    // Should succeed even if user has no 2FA (no-op)
    it("should succeed when user has no 2FA", async () => {
      const result = await adminResetTwoFactor(formData({ userId: testUser.id }));
      expect(result).toBeUndefined();
    });

    // Should fail with invalid userId
    it("should fail with non-existent userId", async () => {
      const result = await adminResetTwoFactor(
        formData({ userId: "00000000-0000-0000-0000-000000000000" }),
      );
      expect(result).toBeDefined();
      expect(result?.code).toBe("userNotFound");
    });
  });
});
