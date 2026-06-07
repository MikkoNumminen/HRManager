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
  updateTag: jest.fn(),
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
} from "@/features/twoFactor/actions";
import {
  getTwoFactorStatus,
  isUserTwoFactorEnabled,
  getUserTwoFactorAuth,
} from "@/features/twoFactor/queries";
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
  }, 30_000);

  describe("getTwoFactorStatus", () => {
    // Returns null when not authenticated
    it("should return null when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const result = await getTwoFactorStatus();
      expect(result).toBeNull();
    });

    // Returns enabled=false and hasSetup=false when no 2FA record exists
    it("should return enabled=false and hasSetup=false when no 2FA record", async () => {
      const result = await getTwoFactorStatus();
      expect(result).toEqual({ enabled: false, hasSetup: false });
    });

    // Returns enabled=true and hasSetup=true when 2FA is enabled
    it("should return enabled=true and hasSetup=true when 2FA is enabled", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: true,
          recoveryCodes: [],
        },
      });

      const result = await getTwoFactorStatus();
      expect(result).toEqual({ enabled: true, hasSetup: true });
    });

    // Returns enabled=false and hasSetup=true when 2FA record exists but not enabled
    it("should return enabled=false and hasSetup=true when record exists but not enabled", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: false,
          recoveryCodes: [],
        },
      });

      const result = await getTwoFactorStatus();
      expect(result).toEqual({ enabled: false, hasSetup: true });
    });
  });

  describe("isUserTwoFactorEnabled", () => {
    // Returns false when no 2FA record exists
    it("should return false when no 2FA record exists", async () => {
      const result = await isUserTwoFactorEnabled(testUser.id);
      expect(result).toBe(false);
    });

    // Returns true when 2FA is enabled
    it("should return true when 2FA is enabled", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: true,
          recoveryCodes: [],
        },
      });

      const result = await isUserTwoFactorEnabled(testUser.id);
      expect(result).toBe(true);
    });

    // Returns false when 2FA record exists but is disabled
    it("should return false when 2FA record exists but disabled", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted",
          enabled: false,
          recoveryCodes: [],
        },
      });

      const result = await isUserTwoFactorEnabled(testUser.id);
      expect(result).toBe(false);
    });
  });

  describe("getUserTwoFactorAuth", () => {
    // Returns null when no 2FA record exists
    it("should return null when no 2FA record exists", async () => {
      const result = await getUserTwoFactorAuth(testUser.id);
      expect(result).toBeNull();
    });

    // Returns the 2FA record with encrypted secret and recovery codes
    it("should return the 2FA record when it exists", async () => {
      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: "encrypted-secret",
          enabled: true,
          recoveryCodes: ["hash1", "hash2"],
        },
      });

      const result = await getUserTwoFactorAuth(testUser.id);
      expect(result).not.toBeNull();
      expect(result!.encryptedSecret).toBe("encrypted-secret");
      expect(result!.enabled).toBe(true);
      expect(result!.recoveryCodes).toEqual(["hash1", "hash2"]);
    });
  });

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  }, 30_000);

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
    // Should reject when secret field is missing — invalidTotpSecret error (line 78).
    it("should reject when secret is missing", async () => {
      // code is 6 chars so it passes the length check, but secret is empty — hits line 78.
      const result = await confirmTwoFactorSetup(
        formData({ code: "123456", secret: "", recoveryCodes: JSON.stringify([]) }),
      );
      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpSecret");
    });

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
    // Should reject when code field is missing or empty — invalidTotpCode (line 145-146).
    it("should reject when code is missing", async () => {
      const result = await disableTwoFactor(formData({}));
      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });

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
    // Should fail loudly when 2FA is not enabled — silently returning success
    // would let a stale "2FA required" JWT bypass verification after an admin reset.
    it("should return twoFactorNotEnabled error when 2FA is not enabled for user", async () => {
      // No twoFactorAuth record exists — verifyTwoFactorLogin must reject, not succeed.
      const result = await verifyTwoFactorLogin(formData({ code: "123456" }));
      expect(result).toHaveProperty("code", "twoFactorNotEnabled");
    });

    // Should reject when code field is missing — invalidTotpCode (line 262).
    it("should reject when code is missing", async () => {
      const result = await verifyTwoFactorLogin(formData({}));
      expect(result).toBeDefined();
      expect(result?.code).toBe("invalidTotpCode");
    });

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

    // Records server-side 2FA verification on the current session (the JWT reads this).
    it("marks the current session twoFactorVerifiedAt on success", async () => {
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
      const sess = await testPrisma.userSession.create({ data: { userId: testUser.id } });
      auth.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email, sessionId: sess.id },
      });

      const result = await verifyTwoFactorLogin(formData({ code: totp.generate() }));
      expect(result).toBeUndefined();

      const updated = await testPrisma.userSession.findUnique({ where: { id: sess.id } });
      expect(updated!.twoFactorVerifiedAt).not.toBeNull();
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

  describe("regenerateRecoveryCodes", () => {
    // Should regenerate recovery codes when given a valid TOTP code
    it("should regenerate recovery codes with a valid code", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
      const totp = generateTotpSecret(testUser.email);
      const secret = getTotpBase32(totp);
      const { encryptSecret } = require("@/lib/totpCrypto");
      const oldCodes = generateRecoveryCodes();

      await testPrisma.twoFactorAuth.create({
        data: {
          userId: testUser.id,
          encryptedSecret: encryptSecret(secret),
          enabled: true,
          recoveryCodes: oldCodes.map(hashRecoveryCode),
        },
      });

      const code = totp.generate();
      const result = await regenerateRecoveryCodes(formData({ code }));

      // Returns new recovery codes
      expect(result).toHaveProperty("recoveryCodes");
      const newCodes = (result as { recoveryCodes: string[] }).recoveryCodes;
      expect(newCodes).toHaveLength(10);
      // New codes should differ from old codes
      expect(newCodes.sort().join(",")).not.toBe(oldCodes.sort().join(","));
    });

    // Should return error when not authenticated
    it("should return error when not authenticated", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
      auth.mockResolvedValue(null);
      const result = await regenerateRecoveryCodes(formData({ code: "123456" }));
      expect(result).toHaveProperty("error");
    });

    // Should return error when code is too short
    it("should return error when code is too short", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
      const result = await regenerateRecoveryCodes(formData({ code: "12" }));
      expect(result).toHaveProperty("code", "invalidTotpCode");
    });

    // Should return error when 2FA is not enabled
    it("should return error when 2FA is not enabled", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
      const result = await regenerateRecoveryCodes(formData({ code: "123456" }));
      expect(result).toHaveProperty("code", "twoFactorNotEnabled");
    });

    // Should return unexpectedError when a non-ActionError is thrown — covers lines 240-243.
    it("should return unexpectedError when DB throws a generic error", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
      const { prisma } = require("@/db");

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

      // Force a non-ActionError inside the try block by making $transaction throw.
      const originalTransaction = prisma.$transaction;
      prisma.$transaction = jest.fn().mockRejectedValueOnce(new Error("DB connection lost"));

      const code = totp.generate();
      const result = await regenerateRecoveryCodes(formData({ code }));

      // Restore the original implementation.
      prisma.$transaction = originalTransaction;

      expect(result).toHaveProperty("code", "unexpectedError");
    });

    // Should return error when TOTP code is invalid
    it("should return error when TOTP code is invalid", async () => {
      const { regenerateRecoveryCodes } = require("@/serverActions");
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

      const result = await regenerateRecoveryCodes(formData({ code: "000000" }));
      expect(result).toHaveProperty("code", "invalidTotpCode");
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
