import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — ESM imports that Jest can't parse in CJS mode.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so tests focus on data logic.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging — deferAudit calls auth() and after() which need request scope.
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

// Mock rate limiting — rateLimit uses next/headers which doesn't exist in tests.
jest.mock("@/rateLimit", () => ({
  rateLimit: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests");
      this.name = "RateLimitError";
    }
  },
}));

// Mock demo session — defaults to null (production mode).
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

// Mock Next.js server functions.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import { isFeatureEnabled, getEnabledFlags } from "@/lib/featureFlag";
import {
  createFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
  setUserFeatureFlag,
  removeUserFeatureFlag,
} from "@/features/featureFlags/actions";

// Helper to build FormData from key-value pairs.
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

// Helper to create a user directly in the DB for user override tests.
async function createTestUser(
  overrides: Partial<{ email: string; name: string; role: string }> = {},
) {
  return testPrisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}@example.com`,
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "user",
    },
  });
}

// Helper to create a feature flag directly in the DB.
async function createTestFlag(
  overrides: Partial<{
    name: string;
    enabled: boolean;
    scope: "GLOBAL" | "USER";
    description: string | null;
  }> = {},
) {
  return testPrisma.featureFlag.create({
    data: {
      name: overrides.name ?? `flag-${Date.now()}`,
      enabled: overrides.enabled ?? false,
      scope: overrides.scope ?? "GLOBAL",
      description: overrides.description ?? null,
    },
  });
}

// Clean up feature flag tables in addition to the shared cleanDb tables.
async function cleanAll() {
  await testPrisma.userFeatureFlag.deleteMany();
  await testPrisma.featureFlag.deleteMany();
  await cleanDb();
}

// ─── isFeatureEnabled ─────────────────────────────────────────

describe("isFeatureEnabled", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Returns false when the flag name does not exist in the DB.
  test("returns false for unknown flag name", async () => {
    const result = await isFeatureEnabled("nonexistent-flag");
    expect(result).toBe(false);
  });

  // Returns the global flag value when no userId is provided.
  test("returns global flag value when no userId provided", async () => {
    await createTestFlag({ name: "my-global-flag", enabled: true, scope: "GLOBAL" });
    const result = await isFeatureEnabled("my-global-flag");
    expect(result).toBe(true);
  });

  // Environment override FEATURE_FLAG_X=true takes precedence over DB value.
  test("env override FEATURE_FLAG_X=true takes precedence", async () => {
    await createTestFlag({ name: "env-flag", enabled: false });
    process.env.FEATURE_FLAG_ENV_FLAG = "true";
    try {
      const result = await isFeatureEnabled("env-flag");
      expect(result).toBe(true);
    } finally {
      delete process.env.FEATURE_FLAG_ENV_FLAG;
    }
  });

  // Environment override FEATURE_FLAG_X=false takes precedence over DB value.
  test("env override FEATURE_FLAG_X=false takes precedence", async () => {
    await createTestFlag({ name: "env-off-flag", enabled: true });
    process.env.FEATURE_FLAG_ENV_OFF_FLAG = "false";
    try {
      const result = await isFeatureEnabled("env-off-flag");
      expect(result).toBe(false);
    } finally {
      delete process.env.FEATURE_FLAG_ENV_OFF_FLAG;
    }
  });

  // User override takes precedence over global value for USER-scoped flags.
  test("user override takes precedence over global for USER scope", async () => {
    const flag = await createTestFlag({ name: "user-flag", enabled: false, scope: "USER" });
    const user = await createTestUser({ email: "override@example.com" });
    await testPrisma.userFeatureFlag.create({
      data: { userId: user.id, flagId: flag.id, enabled: true },
    });
    const result = await isFeatureEnabled("user-flag", user.id);
    expect(result).toBe(true);
  });

  // User override is ignored for GLOBAL-scoped flags (returns global value).
  test("user override ignored for GLOBAL scope flags", async () => {
    const flag = await createTestFlag({ name: "global-only", enabled: true, scope: "GLOBAL" });
    const user = await createTestUser({ email: "ignored@example.com" });
    await testPrisma.userFeatureFlag.create({
      data: { userId: user.id, flagId: flag.id, enabled: false },
    });
    const result = await isFeatureEnabled("global-only", user.id);
    expect(result).toBe(true);
  });

  // Returns false when flag exists but is disabled and no user override.
  test("returns false when flag exists but is disabled", async () => {
    await createTestFlag({ name: "disabled-flag", enabled: false });
    const result = await isFeatureEnabled("disabled-flag");
    expect(result).toBe(false);
  });
});

// ─── getEnabledFlags ──────────────────────────────────────────

describe("getEnabledFlags", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Returns correct values for multiple flags in one call.
  test("returns correct values for multiple flags", async () => {
    await createTestFlag({ name: "flag-a", enabled: true });
    await createTestFlag({ name: "flag-b", enabled: false });
    const result = await getEnabledFlags(["flag-a", "flag-b"]);
    expect(result).toEqual({ "flag-a": true, "flag-b": false });
  });

  // Handles a mix of existing and non-existing flags (non-existing = false).
  test("handles mix of existing and non-existing flags", async () => {
    await createTestFlag({ name: "exists-flag", enabled: true });
    const result = await getEnabledFlags(["exists-flag", "nope-flag"]);
    expect(result).toEqual({ "exists-flag": true, "nope-flag": false });
  });

  // Applies environment variable overrides in batch.
  test("applies env overrides in batch", async () => {
    await createTestFlag({ name: "batch-env", enabled: false });
    process.env.FEATURE_FLAG_BATCH_ENV = "true";
    try {
      const result = await getEnabledFlags(["batch-env"]);
      expect(result).toEqual({ "batch-env": true });
    } finally {
      delete process.env.FEATURE_FLAG_BATCH_ENV;
    }
  });
});

// ─── createFeatureFlag action ─────────────────────────────────

describe("createFeatureFlag", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Creates a feature flag in the DB when given valid data.
  test("creates flag in the DB with valid data", async () => {
    await createFeatureFlag(formData({ name: "my-flag", description: "A test flag" }));
    const flags = await testPrisma.featureFlag.findMany();
    expect(flags).toHaveLength(1);
    expect(flags[0].name).toBe("my-flag");
    expect(flags[0].description).toBe("A test flag");
  });

  // Returns an error when a flag with the same name already exists.
  test("rejects duplicate name", async () => {
    await createTestFlag({ name: "dup-flag" });
    const result = await createFeatureFlag(formData({ name: "dup-flag" }));
    expect(result).toMatchObject({ error: expect.any(String) });
    const flags = await testPrisma.featureFlag.findMany();
    expect(flags).toHaveLength(1);
  });

  // Returns an error when the name format is invalid (uppercase letters).
  test("rejects invalid name format (uppercase)", async () => {
    const result = await createFeatureFlag(formData({ name: "MyFlag" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Returns an error when the name format is invalid (spaces).
  test("rejects invalid name format (spaces)", async () => {
    const result = await createFeatureFlag(formData({ name: "my flag" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── toggleFeatureFlag action ─────────────────────────────────

describe("toggleFeatureFlag", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Flips the enabled state of a feature flag.
  test("flips enabled state", async () => {
    const flag = await createTestFlag({ name: "toggle-me", enabled: false });
    await toggleFeatureFlag(formData({ flagId: flag.id, enabled: "true" }));
    const updated = await testPrisma.featureFlag.findUnique({ where: { id: flag.id } });
    expect(updated!.enabled).toBe(true);
  });
});

// ─── deleteFeatureFlag action ─────────────────────────────────

describe("deleteFeatureFlag", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Removes a flag and cascades deletion of user overrides.
  test("removes flag and cascades user overrides", async () => {
    const flag = await createTestFlag({ name: "delete-me", scope: "USER" });
    const user = await createTestUser({ email: "cascade@example.com" });
    await testPrisma.userFeatureFlag.create({
      data: { userId: user.id, flagId: flag.id, enabled: true },
    });
    await deleteFeatureFlag(formData({ flagId: flag.id }));
    const flags = await testPrisma.featureFlag.findMany();
    expect(flags).toHaveLength(0);
    const overrides = await testPrisma.userFeatureFlag.findMany();
    expect(overrides).toHaveLength(0);
  });
});

// ─── setUserFeatureFlag action ────────────────────────────────

describe("setUserFeatureFlag", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Creates a user override for a feature flag.
  test("creates user override", async () => {
    const flag = await createTestFlag({ name: "user-set", scope: "USER" });
    const user = await createTestUser({ email: "useroverride@example.com" });
    await setUserFeatureFlag(formData({ flagId: flag.id, userId: user.id, enabled: "true" }));
    const overrides = await testPrisma.userFeatureFlag.findMany({ where: { flagId: flag.id } });
    expect(overrides).toHaveLength(1);
    expect(overrides[0].enabled).toBe(true);
  });

  // Updates an existing user override.
  test("updates existing override", async () => {
    const flag = await createTestFlag({ name: "user-update", scope: "USER" });
    const user = await createTestUser({ email: "updateoverride@example.com" });
    await testPrisma.userFeatureFlag.create({
      data: { userId: user.id, flagId: flag.id, enabled: true },
    });
    await setUserFeatureFlag(formData({ flagId: flag.id, userId: user.id, enabled: "false" }));
    const overrides = await testPrisma.userFeatureFlag.findMany({ where: { flagId: flag.id } });
    expect(overrides).toHaveLength(1);
    expect(overrides[0].enabled).toBe(false);
  });
});

// ─── removeUserFeatureFlag action ─────────────────────────────

describe("removeUserFeatureFlag", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Deletes a user override for a feature flag.
  test("deletes user override", async () => {
    const flag = await createTestFlag({ name: "user-remove", scope: "USER" });
    const user = await createTestUser({ email: "removeoverride@example.com" });
    await testPrisma.userFeatureFlag.create({
      data: { userId: user.id, flagId: flag.id, enabled: true },
    });
    await removeUserFeatureFlag(formData({ flagId: flag.id, userId: user.id }));
    const overrides = await testPrisma.userFeatureFlag.findMany({ where: { flagId: flag.id } });
    expect(overrides).toHaveLength(0);
  });
});
