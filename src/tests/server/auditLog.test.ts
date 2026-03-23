import { cleanDb } from "./testDb";
import {
  setupTestMongo,
  teardownTestMongo,
  cleanTestMongo,
  getTestAuditLogCollection,
} from "./testMongoDb";

// Mock next/server after() to collect callbacks so tests can await them
const afterCallbacks: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (cb: () => Promise<void>) => {
    afterCallbacks.push(cb);
  },
}));
async function flushAfterCallbacks() {
  for (const cb of afterCallbacks) await cb();
  afterCallbacks.length = 0;
}

// Mock @/mongoDb to use the in-memory test MongoDB collection via globalThis
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testAuditLogCollection,
}));

// Mock @/db (still needed for cleanDb which uses PG)
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock auth — logAudit uses auth() to identify the acting user
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock demo session — defaults to null (production mode)
jest.mock("@/demoSession", () => ({
  getDemoSessionId: jest.fn().mockResolvedValue(null),
}));

import { logAudit, logPermissionDenial, logRateLimitHit } from "@/auditLog";

beforeAll(async () => {
  await setupTestMongo();
  (globalThis as Record<string, unknown>).__testAuditLogCollection = getTestAuditLogCollection();
});

beforeEach(async () => {
  jest.clearAllMocks();
  await cleanDb();
  await cleanTestMongo();
});

afterAll(async () => {
  await teardownTestMongo();
});

describe("logAudit", () => {
  // Creates an audit log entry with the current user's info.
  test("creates an audit log entry with user info", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "alice@example.com" },
    });

    await logAudit({
      action: "create",
      entityType: "person",
      entityId: "person-456",
      after: { name: "Alice" },
    });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe("user-123");
    expect(logs[0].userEmail).toBe("alice@example.com");
    expect(logs[0].action).toBe("create");
    expect(logs[0].entityType).toBe("person");
    expect(logs[0].entityId).toBe("person-456");
    expect(logs[0].after).toBe('{"name":"Alice"}');
    expect(logs[0].before).toBeNull();
  });

  // Creates an audit log with null user when no one is logged in.
  test("creates audit log with null user when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await logAudit({
      action: "seed",
      entityType: "person",
      after: { clearExisting: true },
    });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(logs[0].action).toBe("seed");
  });

  // Stores before and after as JSON strings.
  test("serializes before and after as JSON", async () => {
    mockAuth.mockResolvedValue(null);

    await logAudit({
      action: "update",
      entityType: "person",
      entityId: "p-1",
      before: { position: "Dev" },
      after: { position: "Senior Dev" },
    });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs[0].before).toBe('{"position":"Dev"}');
    expect(logs[0].after).toBe('{"position":"Senior Dev"}');
  });

  // Stores null when before/after are not provided (undefined).
  test("stores null for undefined before and after", async () => {
    mockAuth.mockResolvedValue(null);

    await logAudit({
      action: "delete",
      entityType: "team",
      entityId: "t-1",
    });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs[0].before).toBeNull();
    expect(logs[0].after).toBeNull();
  });

  // Stores null for entityId when not provided.
  test("stores null for undefined entityId", async () => {
    mockAuth.mockResolvedValue(null);

    await logAudit({
      action: "reset",
      entityType: "person",
      before: { count: 5 },
    });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs[0].entityId).toBeNull();
  });
});

describe("logPermissionDenial", () => {
  // Logs a permission denial with user info from the session (deferred via after()).
  test("logs permission denial with authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-456", email: "denied@example.com" },
    });

    await logPermissionDenial("person:delete");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("permission_denied");
    expect(logs[0].entityType).toBe("security");
    expect(logs[0].userId).toBe("user-456");
    expect(logs[0].userEmail).toBe("denied@example.com");
    expect(JSON.parse(logs[0].after!)).toEqual({ permissionKey: "person:delete" });
  });

  // Logs a permission denial with null user when unauthenticated (deferred via after()).
  test("logs permission denial for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    await logPermissionDenial("admin:manage_users");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("permission_denied");
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(JSON.parse(logs[0].after!)).toEqual({ permissionKey: "admin:manage_users" });
  });

  // Logs error to console when database write fails (does not throw).
  test("logs error to console when write fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const col = getTestAuditLogCollection();
    const insertSpy = jest
      .spyOn(col, "insertOne")
      .mockRejectedValueOnce(new Error("DB write failed"));

    mockAuth.mockResolvedValue({
      user: { id: "user-err", email: "err@example.com" },
    });

    await logPermissionDenial("person:delete");
    await flushAfterCallbacks();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[audit] Failed to log permission denial:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
    insertSpy.mockRestore();
  });
});

describe("logRateLimitHit", () => {
  // Logs a rate limit hit with action and identifier (deferred via after()).
  test("logs rate limit hit with action and identifier", async () => {
    await logRateLimitHit("createPerson", "ip:192.168.1.1");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("rate_limited");
    expect(logs[0].entityType).toBe("security");
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(JSON.parse(logs[0].after!)).toEqual({
      rateLimitedAction: "createPerson",
      identifier: "ip:aXA6MTkyLjE2...",
    });
  });

  // Logs a rate limit hit for auth endpoint (deferred via after()).
  test("logs rate limit hit for auth endpoint", async () => {
    await logRateLimitHit("auth:signin", "ip:10.0.0.1");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("rate_limited");
    expect(JSON.parse(logs[0].after!)).toEqual({
      rateLimitedAction: "auth:signin",
      identifier: "ip:aXA6MTAuMC4w...",
    });
  });

  // Logs error to console when database write fails (does not throw).
  test("logs error to console when write fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const col = getTestAuditLogCollection();
    const insertSpy = jest
      .spyOn(col, "insertOne")
      .mockRejectedValueOnce(new Error("DB write failed"));

    await logRateLimitHit("createPerson", "ip:10.0.0.1");
    await flushAfterCallbacks();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[audit] Failed to log rate limit hit:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
    insertSpy.mockRestore();
  });
});
