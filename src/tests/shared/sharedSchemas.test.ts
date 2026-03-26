/**
 * Tests for @/schemas/shared — covers env-var branches of getAllowedImageDomains
 * that cannot be reached in schemas.test.ts because the module is already loaded.
 * Each describe block resets modules to force a fresh import with different env vars.
 */

import {
  EmailSchema,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
} from "@/schemas/shared";

describe("shared schema constants", () => {
  // MAX_NAME_LENGTH is the standard DB varchar cap
  test("MAX_NAME_LENGTH is 255", () => {
    expect(MAX_NAME_LENGTH).toBe(255);
  });

  // MAX_EMAIL_LENGTH follows RFC 5321
  test("MAX_EMAIL_LENGTH is 320", () => {
    expect(MAX_EMAIL_LENGTH).toBe(320);
  });

  // MAX_POSITION_LENGTH matches DB column
  test("MAX_POSITION_LENGTH is 255", () => {
    expect(MAX_POSITION_LENGTH).toBe(255);
  });

  // MAX_DESCRIPTION_LENGTH is the long-text cap
  test("MAX_DESCRIPTION_LENGTH is 1000", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(1000);
  });

  // MAX_URL_LENGTH follows common browser limits
  test("MAX_URL_LENGTH is 2048", () => {
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});

describe("EmailSchema", () => {
  // Valid email addresses pass
  test("accepts valid email", () => {
    expect(() => EmailSchema.parse("user@example.com")).not.toThrow();
  });

  // Email without @ is rejected
  test("rejects email without @", () => {
    expect(() => EmailSchema.parse("notanemail")).toThrow();
  });

  // Email exceeding max length is rejected (MAX_EMAIL_LENGTH = 320)
  test("rejects email exceeding MAX_EMAIL_LENGTH", () => {
    // local part + "@" + domain must exceed 320 chars
    const longEmail = "a".repeat(310) + "@example.com";
    expect(() => EmailSchema.parse(longEmail)).toThrow();
  });

  // Empty string is rejected as not a valid email
  test("rejects empty string", () => {
    expect(() => EmailSchema.parse("")).toThrow();
  });
});

describe("ImageUrlSchema — ALLOWED_IMAGE_DOMAINS=* (wildcard)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ALLOWED_IMAGE_DOMAINS: "*" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // With wildcard setting, any https domain should be accepted
  test("accepts any https domain when ALLOWED_IMAGE_DOMAINS=*", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("https://totally-custom-cdn.example.com/photo.jpg");
    expect(result.success).toBe(true);
  });

  // Even non-CDN domains pass when wildcard is set
  test("accepts evil.com when ALLOWED_IMAGE_DOMAINS=*", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("https://evil.com/avatar.png");
    expect(result.success).toBe(true);
  });

  // Non-http protocols still fail even with wildcard domain setting
  test("still rejects non-http protocol with wildcard domain", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("ftp://any-domain.com/photo.png");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalidUrlProtocol");
  });

  // Invalid URL format still fails even with wildcard domain setting
  test("still rejects invalid URL format with wildcard domain", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("not-a-url");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalidUrlFormat");
  });
});

describe("ImageUrlSchema — ALLOWED_IMAGE_DOMAINS=custom list", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ALLOWED_IMAGE_DOMAINS: "cdn.mycompany.com , assets.myapp.io",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Hosts in the custom list are allowed
  test("accepts domain in custom ALLOWED_IMAGE_DOMAINS list", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("https://cdn.mycompany.com/photo.jpg");
    expect(result.success).toBe(true);
  });

  // Spaces around entries are trimmed (test assets.myapp.io)
  test("accepts second domain from custom list (trims spaces)", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("https://assets.myapp.io/avatar.png");
    expect(result.success).toBe(true);
  });

  // Domains NOT in the custom list AND not a googleusercontent.com subdomain are rejected
  test("rejects domain not in custom list and not a googleusercontent subdomain", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    // github avatars are in the default list but NOT in our custom list — and not googleusercontent
    const result = ImageUrlSchema.safeParse("https://avatars.githubusercontent.com/u/12345?v=4");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("imageUrlDomainNotAllowed");
  });

  // The hardcoded googleusercontent.com subdomain rule applies even with a custom list
  test("googleusercontent.com subdomains still pass even with custom domain list", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    // isAllowedImageHostname has a hardcoded endsWith(".googleusercontent.com") check
    const result = ImageUrlSchema.safeParse("https://some-cdn.googleusercontent.com/photo.jpg");
    expect(result.success).toBe(true);
  });
});

describe("ImageUrlSchema — ALLOWED_IMAGE_DOMAINS=whitespace only (treated as unset)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ALLOWED_IMAGE_DOMAINS: "   " };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Whitespace-only env var is treated as unset → use default list
  test("whitespace-only ALLOWED_IMAGE_DOMAINS falls back to default list", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    // Default list includes lh3.googleusercontent.com
    const result = ImageUrlSchema.safeParse("https://lh3.googleusercontent.com/photo.jpg");
    expect(result.success).toBe(true);
  });

  // Non-default domains are still rejected
  test("non-default domains rejected when ALLOWED_IMAGE_DOMAINS is whitespace", async () => {
    const { ImageUrlSchema } = await import("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("https://evil.com/photo.jpg");
    expect(result.success).toBe(false);
  });
});

describe("ImageUrlSchema — http protocol (non-https)", () => {
  // http:// is accepted (both http and https are in the allowed protocols list)
  test("accepts http:// protocol on allowed domain", () => {
    // Re-import with default env
    const { ImageUrlSchema } = require("@/schemas/shared");
    const result = ImageUrlSchema.safeParse("http://lh3.googleusercontent.com/photo.jpg");
    expect(result.success).toBe(true);
  });
});
