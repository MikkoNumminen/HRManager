import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock auth — logAudit uses auth() to identify the acting user
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock next/server after() — execute callbacks immediately so tests can verify DB writes
const afterCallbacks: (() => void | Promise<void>)[] = [];
jest.mock("next/server", () => ({
  after: (cb: () => void | Promise<void>) => {
    afterCallbacks.push(cb);
  },
}));

// Helper to flush all deferred after() callbacks
async function flushAfterCallbacks() {
  for (const cb of afterCallbacks) {
    await cb();
  }
  afterCallbacks.length = 0;
}

import {
  logAudit,
  logPermissionDenial,
  logRateLimitHit,
  captureAuditContext,
  deferAudit,
  deferAuditLog,
} from "@/auditLog";

beforeEach(async () => {
  jest.clearAllMocks();
  afterCallbacks.length = 0;
  await cleanDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("logAudit", () => {
  // Creates an audit log entry with the current user's info (synchronous write).
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

    const logs = await testPrisma.auditLog.findMany();
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

    const logs = await testPrisma.auditLog.findMany();
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

    const logs = await testPrisma.auditLog.findMany();
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

    const logs = await testPrisma.auditLog.findMany();
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

    const logs = await testPrisma.auditLog.findMany();
    expect(logs[0].entityId).toBeNull();
  });
});

describe("captureAuditContext", () => {
  // Captures authenticated user's id, email, and demo session id.
  test("captures user context from session", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-abc", email: "bob@example.com" },
    });

    const ctx = await captureAuditContext();
    expect(ctx.userId).toBe("user-abc");
    expect(ctx.userEmail).toBe("bob@example.com");
    expect(ctx.sessionId).toBeNull();
  });

  // Returns null user fields when unauthenticated.
  test("returns null user when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const ctx = await captureAuditContext();
    expect(ctx.userId).toBeNull();
    expect(ctx.userEmail).toBeNull();
  });
});

describe("deferAudit", () => {
  // Schedules audit entries via after() — they write to DB when callback runs.
  test("writes entries to DB when after() callback executes", async () => {
    deferAudit([
      {
        userId: "u-1",
        userEmail: "test@example.com",
        sessionId: null,
        action: "create",
        entityType: "person",
        entityId: "p-1",
        after: { name: "Test" },
      },
    ]);

    // Nothing written yet (deferred via after())
    const logsBefore = await testPrisma.auditLog.findMany();
    expect(logsBefore).toHaveLength(0);

    // Flush the after() callbacks
    await flushAfterCallbacks();

    const logsAfter = await testPrisma.auditLog.findMany();
    expect(logsAfter).toHaveLength(1);
    expect(logsAfter[0].userId).toBe("u-1");
    expect(logsAfter[0].userEmail).toBe("test@example.com");
    expect(logsAfter[0].action).toBe("create");
    expect(logsAfter[0].entityType).toBe("person");
    expect(logsAfter[0].entityId).toBe("p-1");
    expect(logsAfter[0].after).toBe('{"name":"Test"}');
  });

  // Writes multiple entries in a single deferred batch.
  test("writes multiple entries in one batch", async () => {
    deferAudit([
      {
        userId: null,
        userEmail: null,
        sessionId: null,
        action: "delete",
        entityType: "team",
        entityId: "t-1",
        before: { teamName: "Alpha" },
      },
      {
        userId: null,
        userEmail: null,
        sessionId: null,
        action: "delete",
        entityType: "team",
        entityId: "t-2",
        before: { teamName: "Beta" },
      },
    ]);

    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany({ orderBy: { entityId: "asc" } });
    expect(logs).toHaveLength(2);
    expect(logs[0].entityId).toBe("t-1");
    expect(logs[1].entityId).toBe("t-2");
  });

  // Does nothing when given an empty array.
  test("skips scheduling when entries array is empty", () => {
    deferAudit([]);
    expect(afterCallbacks).toHaveLength(0);
  });
});

describe("deferAuditLog", () => {
  // Convenience wrapper that captures context and defers a single entry.
  test("captures context and defers a single audit entry", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u-99", email: "defer@example.com" },
    });

    await deferAuditLog({
      action: "seed",
      entityType: "person",
      after: { clearExisting: true },
    });

    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe("u-99");
    expect(logs[0].userEmail).toBe("defer@example.com");
    expect(logs[0].action).toBe("seed");
    expect(JSON.parse(logs[0].after!)).toEqual({ clearExisting: true });
  });
});

describe("logPermissionDenial", () => {
  // Defers a permission denial log via after() with user info from the session.
  test("defers permission denial with authenticated user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-456", email: "denied@example.com" },
    });

    await logPermissionDenial("person:delete");
    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("permission_denied");
    expect(logs[0].entityType).toBe("security");
    expect(logs[0].userId).toBe("user-456");
    expect(logs[0].userEmail).toBe("denied@example.com");
    expect(JSON.parse(logs[0].after!)).toEqual({ permissionKey: "person:delete" });
  });

  // Defers a permission denial log with null user when unauthenticated.
  test("defers permission denial for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    await logPermissionDenial("admin:manage_users");
    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("permission_denied");
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(JSON.parse(logs[0].after!)).toEqual({ permissionKey: "admin:manage_users" });
  });
});

describe("logRateLimitHit", () => {
  // Defers a rate limit hit log via after() with action and identifier.
  test("defers rate limit hit with action and identifier", async () => {
    await logRateLimitHit("createPerson", "ip:192.168.1.1");
    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("rate_limited");
    expect(logs[0].entityType).toBe("security");
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(JSON.parse(logs[0].after!)).toEqual({
      rateLimitedAction: "createPerson",
      identifier: "ip:192.168.1.1",
    });
  });

  // Defers a rate limit hit log for auth endpoint.
  test("defers rate limit hit for auth endpoint", async () => {
    await logRateLimitHit("auth:signin", "ip:10.0.0.1");
    await flushAfterCallbacks();

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("rate_limited");
    expect(JSON.parse(logs[0].after!)).toEqual({
      rateLimitedAction: "auth:signin",
      identifier: "ip:10.0.0.1",
    });
  });
});
