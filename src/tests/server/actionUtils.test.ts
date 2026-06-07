// Mock @/db to avoid real DB connections in this pure-logic test.
jest.mock("@/db", () => ({
  prisma: {},
}));

// Mock next-intl so getTranslations works without Next.js runtime.
jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn().mockResolvedValue((key: string) => `translated:${key}`),
}));

// Mock next/cache so cache functions don't throw outside Next.js runtime.
// unstable_cache passthrough preserves test semantics for wrapped queries.
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  updateTag: jest.fn(),
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

// Mock @/rateLimit — actionUtils imports it transitively; we don't need real rate limiting here.
jest.mock("@/rateLimit", () => ({
  rateLimit: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests");
      this.name = "RateLimitError";
    }
  },
}));

// Mock the Sentry wrapper so safe() reports without a real Sentry runtime.
const mockCaptureServerActionError = jest.fn();
jest.mock("@/lib/sentryCapture", () => ({
  captureServerActionError: (...args: unknown[]) => mockCaptureServerActionError(...args),
}));

import { safe, validateUUID } from "@/lib/actionUtils";
// Import from _shared.ts to ensure the re-export barrel is covered.
import { safe as safeShared } from "@/serverActions/_shared";
import { invalidateDashboardCache, invalidateOrgChartCache } from "@/lib/cacheInvalidation";
import { ActionError } from "@/actionErrors";

describe("serverActions/_shared re-exports", () => {
  // The _shared barrel module re-exports safe and validateUUID from actionUtils.
  // Importing it ensures the re-export line is covered.
  test("safeShared is the same function as safe from actionUtils", () => {
    expect(typeof safeShared).toBe("function");
    expect(safeShared).toBe(safe);
  });
});

describe("cacheInvalidation", () => {
  const { updateTag } = require("next/cache");

  beforeEach(() => jest.clearAllMocks());

  // invalidateDashboardCache calls updateTag for both dashboard and org-data.
  test("invalidateDashboardCache calls updateTag with dashboard and org-data", () => {
    invalidateDashboardCache();
    expect(updateTag).toHaveBeenCalledWith("dashboard");
    expect(updateTag).toHaveBeenCalledWith("org-data");
  });

  // invalidateOrgChartCache calls updateTag with "org-chart".
  test("invalidateOrgChartCache calls updateTag with org-chart", () => {
    invalidateOrgChartCache();
    expect(updateTag).toHaveBeenCalledWith("org-chart");
  });
});

describe("actionUtils safe()", () => {
  beforeEach(() => mockCaptureServerActionError.mockClear());

  // Returns undefined when the function succeeds.
  test("returns undefined on success", async () => {
    const result = await safe(async () => {});
    expect(result).toBeUndefined();
  });

  // Returns an ActionResult when the function throws an ActionError.
  test("catches ActionError and returns error result", async () => {
    const result = await safe(async () => {
      throw new ActionError("personNotFound", "Person not found");
    });
    expect(result).toEqual({ error: "Person not found", code: "personNotFound" });
  });

  // Unexpected errors are reported to Sentry and return a GENERIC message — the raw
  // error.message (which can leak DB internals) must not reach the client.
  test("catches generic Error, reports it, and returns a generic message", async () => {
    const err = new Error('Prisma: column "secret" does not exist');
    const result = await safe(async () => {
      throw err;
    });
    expect(result).toEqual({ error: "translated:unexpectedError", code: "unexpectedError" });
    expect(mockCaptureServerActionError).toHaveBeenCalledWith(err, { source: "safe" });
  });

  // Returns a translated unexpectedError when a non-Error value is thrown.
  test("handles non-Error throws and returns unexpectedError", async () => {
    const result = await safe(async () => {
      throw "just a string error";
    });
    expect(result).toHaveProperty("code", "unexpectedError");
    expect(result).toHaveProperty("error");
  });

  // Re-throws Next.js internal errors (those with a 'digest' property).
  test("re-throws Next.js internal errors with digest property", async () => {
    const nextError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "REDIRECT" });
    await expect(
      safe(async () => {
        throw nextError;
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  // Returns rateLimited error result when a RateLimitError is thrown — covers line 19.
  test("catches RateLimitError and returns rateLimited result", async () => {
    const { RateLimitError } = require("@/rateLimit");
    const result = await safe(async () => {
      throw new RateLimitError();
    });
    expect(result).toEqual({ error: "Too many requests", code: "rateLimited" });
  });
});

describe("actionUtils validateUUID()", () => {
  // Does not throw for a valid UUID.
  test("does not throw for a valid UUID v4", () => {
    expect(() => validateUUID("123e4567-e89b-12d3-a456-426614174000", "userId")).not.toThrow();
  });

  // Throws ActionError for an invalid UUID format.
  test("throws ActionError for an invalid UUID", () => {
    expect(() => validateUUID("not-a-uuid", "userId")).toThrow(ActionError);
  });

  // Throws ActionError with invalidId code for an invalid UUID.
  test("throws ActionError with invalidId code for bad UUID", () => {
    try {
      validateUUID("bad-id", "fieldName");
      fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ActionError);
      expect((err as ActionError).code).toBe("invalidId");
    }
  });
});
