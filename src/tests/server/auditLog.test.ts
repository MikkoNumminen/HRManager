import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock auth — needed by getCurrentUser
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Mock getCurrentUser to control who the "acting user" is
const mockGetCurrentUser = jest.fn();
jest.mock("@/permissions", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { logAudit } from "@/auditLog";

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
    mockGetCurrentUser.mockResolvedValue({
      id: "user-123",
      email: "alice@example.com",
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
    mockGetCurrentUser.mockResolvedValue(null);

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
    mockGetCurrentUser.mockResolvedValue(null);

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
    mockGetCurrentUser.mockResolvedValue(null);

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
    mockGetCurrentUser.mockResolvedValue(null);

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
    mockGetCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "bob@example.com",
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
