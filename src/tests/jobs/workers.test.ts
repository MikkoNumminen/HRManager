// Mock rateLimit cleanup function
const mockCleanupRateLimits = jest.fn().mockResolvedValue(5);
jest.mock("@/rateLimit", () => ({
  cleanupExpiredRateLimits: (...args: unknown[]) => mockCleanupRateLimits(...args),
}));

// Mock demo session cleanup function
const mockCleanupDemoSessions = jest.fn().mockResolvedValue(2);
jest.mock("@/demoSession", () => ({
  cleanupStaleDemoSessions: (...args: unknown[]) => mockCleanupDemoSessions(...args),
}));

// Mock MongoDB — use factory function to avoid hoisting issues
const mockToArray = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn().mockReturnValue({ toArray: mockToArray });
const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
const mockFindFn = jest.fn().mockReturnValue({ sort: mockSort });
const mockIsMongoAvailable = jest.fn().mockReturnValue(true);

jest.mock("@/mongoDb", () => ({
  isMongoAvailable: (...args: unknown[]) => mockIsMongoAvailable(...args),
  getAuditLogCollection: () => ({
    find: (...args: unknown[]) => mockFindFn(...args),
  }),
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    }),
  },
}));

// Mock pg-boss queue
jest.mock("@/jobs/queue", () => ({
  QUEUE_NAMES: {
    CLEANUP: "cleanup",
    AUDIT_EXPORT: "audit-export",
  },
}));

import { registerCleanupWorker } from "@/jobs/workers/cleanup";
import { registerAuditExportWorker } from "@/jobs/workers/auditExport";
import { registerAllWorkers } from "@/jobs/workers/index";

// Helper to capture the worker callback registered with boss.work()
function createMockBoss() {
  const workers: Record<string, (jobs: unknown[]) => Promise<unknown>> = {};
  return {
    work: jest.fn((queueName: string, handler: (jobs: unknown[]) => Promise<unknown>) => {
      workers[queueName] = handler;
    }),
    getWorker: (queueName: string) => workers[queueName],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCleanupRateLimits.mockResolvedValue(5);
  mockCleanupDemoSessions.mockResolvedValue(2);
  mockIsMongoAvailable.mockReturnValue(true);
  mockToArray.mockResolvedValue([]);
  mockLimit.mockReturnValue({ toArray: mockToArray });
  mockSort.mockReturnValue({ limit: mockLimit });
  mockFindFn.mockReturnValue({ sort: mockSort });
});

// Cleanup worker calls cleanupExpiredRateLimits for rate-limits type
test("cleanup worker handles rate-limits type", async () => {
  const boss = createMockBoss();
  registerCleanupWorker(boss as never);

  const handler = boss.getWorker("cleanup");
  expect(handler).toBeDefined();

  const result = await handler([{ id: "job-1", data: { type: "rate-limits" } }]);
  expect(mockCleanupRateLimits).toHaveBeenCalledTimes(1);
  expect(mockCleanupDemoSessions).not.toHaveBeenCalled();
  expect(result).toEqual({ rateLimitDeleted: 5, demoSessionsCleaned: 0 });
});

// Cleanup worker calls cleanupStaleDemoSessions for demo-sessions type
test("cleanup worker handles demo-sessions type", async () => {
  const boss = createMockBoss();
  registerCleanupWorker(boss as never);

  const handler = boss.getWorker("cleanup");
  const result = await handler([{ id: "job-2", data: { type: "demo-sessions" } }]);
  expect(mockCleanupDemoSessions).toHaveBeenCalledTimes(1);
  expect(mockCleanupRateLimits).not.toHaveBeenCalled();
  expect(result).toEqual({ rateLimitDeleted: 0, demoSessionsCleaned: 2 });
});

// Cleanup worker runs both cleanups for "all" type
test("cleanup worker handles all type", async () => {
  const boss = createMockBoss();
  registerCleanupWorker(boss as never);

  const handler = boss.getWorker("cleanup");
  const result = await handler([{ id: "job-3", data: { type: "all" } }]);
  expect(mockCleanupRateLimits).toHaveBeenCalledTimes(1);
  expect(mockCleanupDemoSessions).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ rateLimitDeleted: 5, demoSessionsCleaned: 2 });
});

// Audit export worker queries MongoDB with filters and returns JSON
test("audit export worker returns JSON format", async () => {
  const testDocs = [
    {
      _id: { toString: () => "abc123" },
      userId: "user-1",
      userEmail: "test@example.com",
      action: "create",
      entityType: "person",
      entityId: "ent-1",
      before: null,
      after: '{"name":"Test"}',
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  mockToArray.mockResolvedValue(testDocs);

  const boss = createMockBoss();
  registerAuditExportWorker(boss as never);

  const handler = boss.getWorker("audit-export");
  const result = (await handler([
    {
      id: "job-4",
      data: {
        userId: "user-1",
        sessionId: null,
        filters: { action: "create" },
        format: "json",
      },
    },
  ])) as { result: string; count: number };

  expect(result.count).toBe(1);
  const parsed = JSON.parse(result.result);
  expect(parsed).toHaveLength(1);
  expect(parsed[0].action).toBe("create");
  expect(parsed[0].entityType).toBe("person");
  // Org-wide export is scoped to sessionId: null, not an unscoped {} query.
  expect(mockFindFn).toHaveBeenCalledWith(
    expect.objectContaining({ sessionId: null, action: "create" }),
  );
});

// Audit export worker returns CSV format
test("audit export worker returns CSV format", async () => {
  const testDocs = [
    {
      _id: { toString: () => "abc123" },
      userId: "user-1",
      userEmail: "test@example.com",
      action: "create",
      entityType: "person",
      entityId: "ent-1",
      before: null,
      after: '{"name":"Test"}',
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  ];

  mockToArray.mockResolvedValue(testDocs);

  const boss = createMockBoss();
  registerAuditExportWorker(boss as never);

  const handler = boss.getWorker("audit-export");
  const result = (await handler([
    {
      id: "job-5",
      data: {
        userId: "user-1",
        sessionId: "demo-session-1",
        filters: {},
        format: "csv",
      },
    },
  ])) as { result: string; count: number };

  expect(result.count).toBe(1);
  expect(result.result).toContain("id,userId,userEmail,action,entityType");
  expect(result.result).toContain("create");
  // A demo caller's export is scoped to their session only — no cross-tenant leak.
  expect(mockFindFn).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "demo-session-1" }));
});

// Audit export worker returns empty when MongoDB is unavailable
test("audit export worker returns empty when MongoDB unavailable", async () => {
  mockIsMongoAvailable.mockReturnValue(false);

  const boss = createMockBoss();
  registerAuditExportWorker(boss as never);

  const handler = boss.getWorker("audit-export");
  const result = (await handler([
    {
      id: "job-6",
      data: {
        userId: "user-1",
        sessionId: null,
        filters: {},
        format: "json",
      },
    },
  ])) as { result: string; count: number };

  expect(result.result).toBe("[]");
  expect(result.count).toBe(0);
});

// registerAllWorkers registers both cleanup and audit-export workers
test("registerAllWorkers registers all workers", () => {
  const boss = createMockBoss();
  registerAllWorkers(boss as never);

  expect(boss.work).toHaveBeenCalledTimes(2);
  expect(boss.getWorker("cleanup")).toBeDefined();
  expect(boss.getWorker("audit-export")).toBeDefined();
});

// Cleanup worker propagates errors from cleanup functions
test("cleanup worker propagates errors", async () => {
  mockCleanupRateLimits.mockRejectedValue(new Error("DB connection failed"));

  const boss = createMockBoss();
  registerCleanupWorker(boss as never);

  const handler = boss.getWorker("cleanup");
  await expect(handler([{ id: "job-err", data: { type: "rate-limits" } }])).rejects.toThrow(
    "DB connection failed",
  );
});
