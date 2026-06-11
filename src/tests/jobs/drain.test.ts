// Make this file a module so top-level mock declarations don't collide with other test files
export {};

// The drain executes pending pg-boss jobs via fetch/complete/fail — the serverless
// replacement for the boss.work() subscriptions that never run on Vercel. Mock the
// queue and both job handlers; the handlers' own logic is covered elsewhere.
const mockFetch = jest.fn();
const mockComplete = jest.fn().mockResolvedValue(undefined);
const mockFail = jest.fn().mockResolvedValue(undefined);

jest.mock("@/jobs/queue", () => ({
  QUEUE_NAMES: { CLEANUP: "cleanup", AUDIT_EXPORT: "audit-export" },
  getJobQueue: jest.fn().mockResolvedValue({
    fetch: (...args: unknown[]) => mockFetch(...args),
    complete: (...args: unknown[]) => mockComplete(...args),
    fail: (...args: unknown[]) => mockFail(...args),
  }),
}));

const mockRunCleanup = jest.fn();
const mockRunAuditExport = jest.fn();
jest.mock("@/jobs/workers/cleanup", () => ({
  runCleanupJob: (...args: unknown[]) => mockRunCleanup(...args),
}));
jest.mock("@/jobs/workers/auditExport", () => ({
  runAuditExportJob: (...args: unknown[]) => mockRunAuditExport(...args),
}));

jest.mock("next/server", () => ({
  after: (fn: () => unknown) => fn(),
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnValue({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
  },
}));

import { processPendingJobs } from "@/jobs/drain";

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue([]);
  mockComplete.mockClear();
  mockFail.mockClear();
  mockRunCleanup.mockReset();
  mockRunAuditExport.mockReset();
});

describe("processPendingJobs", () => {
  // Pending jobs are executed with the matching handler and completed with its output.
  test("runs fetched jobs through the right handler and completes them", async () => {
    mockFetch.mockImplementation(async (queue: string) =>
      queue === "cleanup" ? [{ id: "job-1", data: { type: "all" } }] : [],
    );
    mockRunCleanup.mockResolvedValue({ rateLimitDeleted: 3, demoSessionsCleaned: 1 });

    const result = await processPendingJobs();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(mockRunCleanup).toHaveBeenCalledWith({ type: "all" }, "job-1");
    expect(mockComplete).toHaveBeenCalledWith("cleanup", "job-1", {
      rateLimitDeleted: 3,
      demoSessionsCleaned: 1,
    });
    expect(mockFail).not.toHaveBeenCalled();
  });

  // A throwing handler marks that job failed (retryable from the admin UI) and
  // does not abort the rest of the batch.
  test("marks a failing job failed and continues with the rest", async () => {
    mockFetch.mockImplementation(async (queue: string) =>
      queue === "audit-export"
        ? [
            { id: "job-1", data: { format: "csv" } },
            { id: "job-2", data: { format: "json" } },
          ]
        : [],
    );
    mockRunAuditExport
      .mockRejectedValueOnce(new Error("mongo down"))
      .mockResolvedValueOnce({ result: "[]", count: 0 });

    const result = await processPendingJobs();

    expect(result).toEqual({ processed: 1, failed: 1 });
    expect(mockFail).toHaveBeenCalledWith("audit-export", "job-1", { message: "mongo down" });
    expect(mockComplete).toHaveBeenCalledWith("audit-export", "job-2", { result: "[]", count: 0 });
  });

  // Empty queues are a no-op.
  test("does nothing when no jobs are pending", async () => {
    const result = await processPendingJobs();
    expect(result).toEqual({ processed: 0, failed: 0 });
    expect(mockComplete).not.toHaveBeenCalled();
    expect(mockFail).not.toHaveBeenCalled();
  });

  // A queue-level error (e.g. queue missing on a fresh DB) skips only that queue.
  test("isolates a queue-level failure so the other queue still drains", async () => {
    mockFetch.mockImplementation(async (queue: string) => {
      if (queue === "cleanup") throw new Error("Queue cleanup does not exist");
      return [{ id: "ae-1", data: { format: "json" } }];
    });
    mockRunAuditExport.mockResolvedValue({ result: "[]", count: 0 });

    const result = await processPendingJobs();

    expect(result).toEqual({ processed: 1, failed: 0 });
    expect(mockComplete).toHaveBeenCalledWith("audit-export", "ae-1", { result: "[]", count: 0 });
  });

  // A full batch triggers another fetch; a short batch ends the loop.
  test("keeps fetching while batches come back full", async () => {
    const full = Array.from({ length: 2 }, (_, i) => ({ id: `c-${i}`, data: { type: "all" } }));
    mockFetch
      .mockResolvedValueOnce(full) // cleanup batch 1 (full)
      .mockResolvedValueOnce([{ id: "c-last", data: { type: "all" } }]) // cleanup batch 2 (short)
      .mockResolvedValue([]); // audit-export
    mockRunCleanup.mockResolvedValue({ rateLimitDeleted: 0, demoSessionsCleaned: 0 });

    const result = await processPendingJobs({ batchSize: 2 });

    expect(result.processed).toBe(3);
    // 2 fetches for cleanup (full then short) + 1 for audit-export
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
