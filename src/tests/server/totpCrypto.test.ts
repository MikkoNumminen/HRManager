import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  getTotpUri,
  getTotpBase32,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  findMatchingRecoveryCode,
} from "@/lib/totpCrypto";
import * as OTPAuth from "otpauth";

// Set a deterministic encryption key for tests
process.env.TOTP_ENCRYPTION_KEY = "test-encryption-key-for-totp-at-least-32-chars";
process.env.NEXTAUTH_SECRET = "nextauth-fallback-secret-for-testing-32-chars";

describe("TOTP Crypto Utilities", () => {
  describe("getEncryptionKey fallback", () => {
    // Falls back to NEXTAUTH_SECRET when TOTP_ENCRYPTION_KEY is not set
    it("should use NEXTAUTH_SECRET as fallback when TOTP_ENCRYPTION_KEY is missing", () => {
      const saved = process.env.TOTP_ENCRYPTION_KEY;
      delete process.env.TOTP_ENCRYPTION_KEY;

      // Should still encrypt/decrypt successfully using NEXTAUTH_SECRET fallback
      const { encryptSecret, decryptSecret } = require("@/lib/totpCrypto");
      const secret = "JBSWY3DPEHPK3PXP";
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);

      process.env.TOTP_ENCRYPTION_KEY = saved;
    });

    // An unfilled template value must not block the fallbacks: .env.example
    // ships TOTP_ENCRYPTION_KEY="" and "" is not nullish, so with ?? a copied
    // template would break k8s deployments whose key is NEXTAUTH_SECRET.
    it("treats an empty TOTP_ENCRYPTION_KEY as unset (falls through to NEXTAUTH_SECRET)", () => {
      const savedTotp = process.env.TOTP_ENCRYPTION_KEY;
      process.env.TOTP_ENCRYPTION_KEY = "";

      const { encryptSecret, decryptSecret } = require("@/lib/totpCrypto");
      const secret = "JBSWY3DPEHPK3PXP";
      expect(decryptSecret(encryptSecret(secret))).toBe(secret);

      process.env.TOTP_ENCRYPTION_KEY = savedTotp;
    });

    // Falls back to AUTH_SECRET (the NextAuth v5 name) outside production —
    // previously only the v4 NEXTAUTH_SECRET counted, which nothing v5 sets.
    it("should use AUTH_SECRET as fallback when the other two are missing", () => {
      const savedTotp = process.env.TOTP_ENCRYPTION_KEY;
      const savedNext = process.env.NEXTAUTH_SECRET;
      const savedAuth = process.env.AUTH_SECRET;
      delete process.env.TOTP_ENCRYPTION_KEY;
      delete process.env.NEXTAUTH_SECRET;
      process.env.AUTH_SECRET = "auth-secret-v5-fallback-for-testing-32-chars";

      const { encryptSecret, decryptSecret } = require("@/lib/totpCrypto");
      const secret = "JBSWY3DPEHPK3PXP";
      expect(decryptSecret(encryptSecret(secret))).toBe(secret);

      process.env.TOTP_ENCRYPTION_KEY = savedTotp;
      process.env.NEXTAUTH_SECRET = savedNext;
      if (savedAuth === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = savedAuth;
    });

    // Throws when all three key sources are absent — covers the dev error branch.
    it("throws when no key source is set", () => {
      const savedTotp = process.env.TOTP_ENCRYPTION_KEY;
      const savedNext = process.env.NEXTAUTH_SECRET;
      const savedAuth = process.env.AUTH_SECRET;
      delete process.env.TOTP_ENCRYPTION_KEY;
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.AUTH_SECRET;

      jest.resetModules();
      const { encryptSecret: encryptFresh } = require("@/lib/totpCrypto");
      expect(() => encryptFresh("JBSWY3DPEHPK3PXP")).toThrow(
        "TOTP_ENCRYPTION_KEY, NEXTAUTH_SECRET, or AUTH_SECRET must be set",
      );

      process.env.TOTP_ENCRYPTION_KEY = savedTotp;
      process.env.NEXTAUTH_SECRET = savedNext;
      if (savedAuth !== undefined) process.env.AUTH_SECRET = savedAuth;
      jest.resetModules();
    });

    // In production AUTH_SECRET deliberately does NOT satisfy the key lookup —
    // 2FA fails closed until a dedicated TOTP_ENCRYPTION_KEY is set (mirrors
    // the AUDIT_HMAC_SECRET pattern in auditHashChain.ts).
    it("throws in production even when AUTH_SECRET is set", () => {
      const savedTotp = process.env.TOTP_ENCRYPTION_KEY;
      const savedNext = process.env.NEXTAUTH_SECRET;
      const savedAuth = process.env.AUTH_SECRET;
      const savedNodeEnv = process.env.NODE_ENV;
      delete process.env.TOTP_ENCRYPTION_KEY;
      delete process.env.NEXTAUTH_SECRET;
      process.env.AUTH_SECRET = "auth-secret-v5-fallback-for-testing-32-chars";
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const { encryptSecret: encryptFresh } = require("@/lib/totpCrypto");
      expect(() => encryptFresh("JBSWY3DPEHPK3PXP")).toThrow(/TOTP_ENCRYPTION_KEY is not set/);

      (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
      process.env.TOTP_ENCRYPTION_KEY = savedTotp;
      process.env.NEXTAUTH_SECRET = savedNext;
      if (savedAuth === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = savedAuth;
    });

    // The legacy NEXTAUTH_SECRET fallback keeps working in production — the k8s
    // templates still set it, and TOTP secrets encrypted under it must stay
    // decryptable.
    it("honors NEXTAUTH_SECRET in production (k8s back-compat)", () => {
      const savedTotp = process.env.TOTP_ENCRYPTION_KEY;
      const savedNodeEnv = process.env.NODE_ENV;
      delete process.env.TOTP_ENCRYPTION_KEY;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const { encryptSecret, decryptSecret } = require("@/lib/totpCrypto");
      const secret = "JBSWY3DPEHPK3PXP";
      expect(decryptSecret(encryptSecret(secret))).toBe(secret);

      (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
      process.env.TOTP_ENCRYPTION_KEY = savedTotp;
    });
  });

  describe("encryptSecret / decryptSecret", () => {
    // Round-trip encryption should return the original secret
    it("should encrypt and decrypt a secret successfully", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const encrypted = encryptSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(secret);
    });

    // Each encryption should produce a different ciphertext (random IV)
    it("should produce different ciphertexts for the same plaintext", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const enc1 = encryptSecret(secret);
      const enc2 = encryptSecret(secret);
      expect(enc1).not.toBe(enc2);

      // Both should decrypt to the same value
      expect(decryptSecret(enc1)).toBe(secret);
      expect(decryptSecret(enc2)).toBe(secret);
    });

    // Tampered ciphertext should throw on decryption
    it("should throw when decrypting tampered data", () => {
      const secret = "JBSWY3DPEHPK3PXP";
      const encrypted = encryptSecret(secret);
      // Tamper with the base64 string
      const tampered = encrypted.slice(0, -4) + "XXXX";
      expect(() => decryptSecret(tampered)).toThrow();
    });
  });

  describe("generateTotpSecret", () => {
    // Should generate a valid TOTP instance
    it("should generate a TOTP with correct properties", () => {
      const totp = generateTotpSecret("user@example.com");
      expect(totp).toBeInstanceOf(OTPAuth.TOTP);
      expect(totp.issuer).toBe("HRManager");
      expect(totp.label).toBe("user@example.com");
      expect(totp.digits).toBe(6);
      expect(totp.period).toBe(30);
    });

    // URI should be a valid otpauth:// URI
    it("should generate a valid otpauth URI", () => {
      const totp = generateTotpSecret("test@example.com");
      const uri = getTotpUri(totp);
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
      expect(uri).toContain("secret=");
      expect(uri).toContain("issuer=HRManager");
    });

    // Base32 secret should be a non-empty string
    it("should return a base32 secret string", () => {
      const totp = generateTotpSecret("test@example.com");
      const base32 = getTotpBase32(totp);
      expect(base32.length).toBeGreaterThan(0);
      // Base32 characters only
      expect(base32).toMatch(/^[A-Z2-7]+=*$/);
    });
  });

  describe("verifyTotpCode", () => {
    // Should verify a correct code generated by OTPAuth
    it("should verify a valid TOTP code", () => {
      const totp = generateTotpSecret("test@example.com");
      const secret = getTotpBase32(totp);
      const code = totp.generate();

      expect(verifyTotpCode(secret, code)).toBe(true);
    });

    // Should reject an obviously wrong code
    it("should reject an invalid TOTP code", () => {
      const totp = generateTotpSecret("test@example.com");
      const secret = getTotpBase32(totp);

      expect(verifyTotpCode(secret, "000000")).toBe(false);
    });

    // Should accept codes within the 1-window drift
    it("should accept codes within drift window", () => {
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "HRManager",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      const code = totp.generate();
      expect(verifyTotpCode(secret.base32, code)).toBe(true);
    });
  });

  describe("generateRecoveryCodes", () => {
    // Should generate exactly 10 codes
    it("should generate 10 recovery codes", () => {
      const codes = generateRecoveryCodes();
      expect(codes).toHaveLength(10);
    });

    // Each code should be in XXXX-XXXX format
    it("should generate codes in XXXX-XXXX format", () => {
      const codes = generateRecoveryCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      }
    });

    // All codes should be unique
    it("should generate unique codes", () => {
      const codes = generateRecoveryCodes();
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe("hashRecoveryCode / findMatchingRecoveryCode", () => {
    // Hash should be deterministic
    it("should produce consistent hashes", () => {
      const code = "ABCD-EF12";
      const hash1 = hashRecoveryCode(code);
      const hash2 = hashRecoveryCode(code);
      expect(hash1).toBe(hash2);
    });

    // Hashing should be case-insensitive and dash-insensitive
    it("should normalize codes before hashing", () => {
      const hash1 = hashRecoveryCode("ABCD-EF12");
      const hash2 = hashRecoveryCode("abcdef12");
      const hash3 = hashRecoveryCode("AbCd-Ef12");
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    // Should find a matching recovery code in a list of hashes
    it("should find a matching recovery code", () => {
      const codes = generateRecoveryCodes();
      const hashed = codes.map(hashRecoveryCode);

      // Each code should match at its index
      for (let i = 0; i < codes.length; i++) {
        expect(findMatchingRecoveryCode(codes[i], hashed)).toBe(i);
      }
    });

    // Should return -1 for non-matching codes
    it("should return -1 for non-matching codes", () => {
      const codes = generateRecoveryCodes();
      const hashed = codes.map(hashRecoveryCode);

      expect(findMatchingRecoveryCode("ZZZZ-ZZZZ", hashed)).toBe(-1);
    });

    // Should match codes without dashes
    it("should match codes regardless of dash formatting", () => {
      const codes = generateRecoveryCodes();
      const hashed = codes.map(hashRecoveryCode);
      // Remove dash and lowercase
      const stripped = codes[0].replace("-", "").toLowerCase();
      expect(findMatchingRecoveryCode(stripped, hashed)).toBe(0);
    });
  });
});
