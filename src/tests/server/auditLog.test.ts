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
  isMongoAvailable: () => true,
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

// Mock hash chain — audit log tests don't need real chain integrity
jest.mock("@/lib/auditHashChain", () => ({
  computeHash: jest.fn().mockReturnValue("test-hash"),
  getLatestHash: jest.fn().mockResolvedValue(null),
}));

// Mock logger — capture structured log calls
const mockLoggerError = jest.fn();
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

import {
  logAudit,
  logPermissionDenial,
  logRateLimitHit,
  captureAuditContext,
  deferAudit,
  deferAuditLog,
} from "@/auditLog";
import { getDemoSessionId } from "@/demoSession";

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

  // Logs error via structured logger when database write fails (does not throw).
  test("logs error via logger when write fails", async () => {
    mockLoggerError.mockClear();
    const col = getTestAuditLogCollection();
    const insertSpy = jest
      .spyOn(col, "insertOne")
      .mockRejectedValueOnce(new Error("DB write failed"));

    mockAuth.mockResolvedValue({
      user: { id: "user-err", email: "err@example.com" },
    });

    await logPermissionDenial("person:delete");
    await flushAfterCallbacks();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Failed to log permission denial",
    );
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

  // Logs error via structured logger when database write fails (does not throw).
  test("logs error via logger when write fails", async () => {
    mockLoggerError.mockClear();
    const col = getTestAuditLogCollection();
    const insertSpy = jest
      .spyOn(col, "insertOne")
      .mockRejectedValueOnce(new Error("DB write failed"));

    await logRateLimitHit("createPerson", "ip:10.0.0.1");
    await flushAfterCallbacks();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Failed to log rate limit hit",
    );
    insertSpy.mockRestore();
  });
});

describe("captureAuditContext", () => {
  // Returns user info and sessionId from current request context.
  test("returns userId, userEmail, and sessionId for authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-ctx-1", email: "ctx@example.com" },
    });
    (getDemoSessionId as jest.Mock).mockResolvedValue("demo-session-abc");

    const ctx = await captureAuditContext();
    expect(ctx).toEqual({
      userId: "user-ctx-1",
      userEmail: "ctx@example.com",
      sessionId: "demo-session-abc",
    });
  });

  // Returns null values when no user is authenticated and no demo session.
  test("returns nulls for unauthenticated non-demo user", async () => {
    mockAuth.mockResolvedValue(null);
    (getDemoSessionId as jest.Mock).mockResolvedValue(null);

    const ctx = await captureAuditContext();
    expect(ctx).toEqual({
      userId: null,
      userEmail: null,
      sessionId: null,
    });
  });
});

describe("deferAudit", () => {
  // Writes multiple audit entries via insertMany inside after() callback.
  test("writes entries via insertMany after flush", async () => {
    const entries = [
      {
        action: "create" as const,
        entityType: "person" as const,
        entityId: "p-1",
        before: undefined,
        after: { name: "Bob" },
        userId: "u-1",
        userEmail: "bob@test.com",
        sessionId: null,
      },
      {
        action: "update" as const,
        entityType: "team" as const,
        entityId: "t-1",
        before: { teamName: "Old" },
        after: { teamName: "New" },
        userId: "u-1",
        userEmail: "bob@test.com",
        sessionId: null,
      },
    ];

    deferAudit(entries);
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(2);
    expect(logs[0].action).toBe("create");
    expect(logs[0].entityType).toBe("person");
    expect(logs[0].userId).toBe("u-1");
    expect(logs[0].after).toBe('{"name":"Bob"}');
    expect(logs[0].before).toBeNull();
    expect(logs[1].action).toBe("update");
    expect(logs[1].before).toBe('{"teamName":"Old"}');
    expect(logs[1].after).toBe('{"teamName":"New"}');
  });

  // Does nothing when entries array is empty (no after() call).
  test("does nothing for empty entries array", async () => {
    deferAudit([]);
    // No after() callback should have been registered
    expect(afterCallbacks).toHaveLength(0);
  });

  // Logs error via structured logger when insertMany fails (does not throw).
  test("logs error via logger when insertMany fails", async () => {
    mockLoggerError.mockClear();
    const col = getTestAuditLogCollection();
    const insertManySpy = jest
      .spyOn(col, "insertMany")
      .mockRejectedValueOnce(new Error("insertMany failed"));

    deferAudit([
      {
        action: "delete" as const,
        entityType: "person" as const,
        userId: null,
        userEmail: null,
        sessionId: null,
      },
    ]);
    await flushAfterCallbacks();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Failed to write deferred audit entries",
    );
    insertManySpy.mockRestore();
  });
});

describe("deferAuditLog", () => {
  // Captures context and defers a single audit entry (convenience wrapper).
  test("captures context and defers single entry", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-defer", email: "defer@test.com" },
    });
    (getDemoSessionId as jest.Mock).mockResolvedValue("sess-xyz");

    await deferAuditLog({
      action: "create",
      entityType: "department",
      entityId: "dept-1",
      after: { name: "Engineering" },
    });
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe("user-defer");
    expect(logs[0].userEmail).toBe("defer@test.com");
    expect(logs[0].sessionId).toBe("sess-xyz");
    expect(logs[0].action).toBe("create");
    expect(logs[0].entityType).toBe("department");
    expect(logs[0].after).toBe('{"name":"Engineering"}');
  });
});

describe("MongoDB unavailable — all functions must return early without writing", () => {
  // Helper: override isMongoAvailable to return false for one call
  function mockMongoUnavailable() {
    jest.spyOn(require("@/mongoDb"), "isMongoAvailable").mockReturnValueOnce(false);
  }

  // logAudit returns early and writes nothing when MongoDB is unavailable.
  test("logAudit does not write when MongoDB unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockMongoUnavailable();

    await logAudit({ action: "create", entityType: "person" });

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(0);
  });

  // deferAudit skips registration of after() callback when MongoDB is unavailable.
  test("deferAudit registers no after() callback when MongoDB unavailable", () => {
    mockMongoUnavailable();
    deferAudit([
      {
        action: "create" as const,
        entityType: "person" as const,
        userId: null,
        userEmail: null,
        sessionId: null,
      },
    ]);
    expect(afterCallbacks).toHaveLength(0);
  });

  // logPermissionDenial returns early and registers no after() callback.
  test("logPermissionDenial registers no after() callback when MongoDB unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockMongoUnavailable();

    await logPermissionDenial("person:delete");

    expect(afterCallbacks).toHaveLength(0);
  });

  // logRateLimitHit returns early and registers no after() callback.
  test("logRateLimitHit registers no after() callback when MongoDB unavailable", async () => {
    mockMongoUnavailable();

    await logRateLimitHit("createPerson", "ip:10.0.0.1");

    expect(afterCallbacks).toHaveLength(0);
  });

  // deferAuditLog wraps deferAudit — also skips when MongoDB unavailable.
  test("deferAuditLog registers no after() callback when MongoDB unavailable", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "u@test.com" } });
    mockMongoUnavailable();

    await deferAuditLog({ action: "create", entityType: "person" });

    expect(afterCallbacks).toHaveLength(0);
  });
});

describe("logRateLimitHit — identifier hashing", () => {
  // IP-based identifiers (ip: prefix) are hashed to avoid storing raw IPs (GDPR)
  test("hashes ip: prefixed identifiers (GDPR — no raw IPs stored)", async () => {
    await logRateLimitHit("createPerson", "ip:203.0.113.42");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    const after = JSON.parse(logs[0].after!);
    // Must not contain the raw IP address
    expect(after.identifier).not.toContain("203.0.113.42");
    expect(after.identifier).toMatch(/^ip:[A-Za-z0-9+/].*\.\.\.$/); // base64 truncated
  });

  // Non-IP identifiers (user: or anonymous) are stored as-is (no PII concern)
  test("stores non-IP identifiers (user:) as-is without hashing", async () => {
    await logRateLimitHit("createPerson", "user:user-abc-123");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    const after = JSON.parse(logs[0].after!);
    expect(after.identifier).toBe("user:user-abc-123");
  });

  // anonymous identifier stored as-is
  test("stores anonymous identifier as-is", async () => {
    await logRateLimitHit("createPerson", "anonymous");
    await flushAfterCallbacks();

    const logs = await getTestAuditLogCollection().find().toArray();
    expect(logs).toHaveLength(1);
    const after = JSON.parse(logs[0].after!);
    expect(after.identifier).toBe("anonymous");
  });
});
