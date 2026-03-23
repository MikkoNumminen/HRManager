import { testPrisma, cleanDb } from "./testDb";

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

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock auth — logAudit uses auth() to identify the acting user
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

import { logAudit, logPermissionDenial, logRateLimitHit } from "@/auditLog";

beforeEach(async () => {
  jest.clearAllMocks();
  await cleanDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
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

  // Works with a transaction client — audit entry is created inside the tx.
  test("uses transaction client when tx is provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "bob@example.com" },
    });

    await testPrisma.$transaction(async (tx) => {
      await logAudit({
        action: "create",
        entityType: "team",
        entityId: "team-1",
        after: { teamName: "Engineering" },
        tx,
      });
    });

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].entityType).toBe("team");
    expect(logs[0].after).toBe('{"teamName":"Engineering"}');
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

    const logs = await testPrisma.auditLog.findMany();
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

    const logs = await testPrisma.auditLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("permission_denied");
    expect(logs[0].userId).toBeNull();
    expect(logs[0].userEmail).toBeNull();
    expect(JSON.parse(logs[0].after!)).toEqual({ permissionKey: "admin:manage_users" });
  });
});

describe("logRateLimitHit", () => {
  // Logs a rate limit hit with action and identifier (deferred via after()).
  test("logs rate limit hit with action and identifier", async () => {
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

  // Logs a rate limit hit for auth endpoint (deferred via after()).
  test("logs rate limit hit for auth endpoint", async () => {
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
