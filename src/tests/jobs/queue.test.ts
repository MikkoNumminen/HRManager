// Make this file a module so top-level mock declarations don't collide with other test files
export {};

// Mock pg-boss before importing queue module
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();
const mockCreateQueue = jest.fn().mockResolvedValue(undefined);

jest.mock("pg-boss", () => ({
  PgBoss: jest.fn().mockImplementation(() => ({
    start: mockStart,
    stop: mockStop,
    on: mockOn,
    createQueue: mockCreateQueue,
  })),
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

// Use a fresh module for each test to reset the singleton
let getJobQueue: typeof import("@/jobs/queue").getJobQueue;
let stopJobQueue: typeof import("@/jobs/queue").stopJobQueue;
let QUEUE_NAMES: typeof import("@/jobs/queue").QUEUE_NAMES;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the module to get a fresh singleton
  jest.resetModules();
});

async function loadModule() {
  // Re-mock pg-boss after module reset
  jest.mock("pg-boss", () => ({
    PgBoss: jest.fn().mockImplementation(() => ({
      start: mockStart,
      stop: mockStop,
      on: mockOn,
      createQueue: mockCreateQueue,
    })),
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
  const mod = await import("@/jobs/queue");
  getJobQueue = mod.getJobQueue;
  stopJobQueue = mod.stopJobQueue;
  QUEUE_NAMES = mod.QUEUE_NAMES;
}

// getJobQueue initializes and starts pg-boss on first call
test("getJobQueue initializes and starts pg-boss", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  await loadModule();
  const boss = await getJobQueue();
  expect(boss).toBeDefined();
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
  // v12 requires queues to exist before send()/fetch() — created at startup.
  expect(mockCreateQueue).toHaveBeenCalledWith("cleanup");
  expect(mockCreateQueue).toHaveBeenCalledWith("audit-export");
});

// getJobQueue returns the same instance on second call (singleton)
test("getJobQueue returns same instance on second call", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  await loadModule();
  const boss1 = await getJobQueue();
  const boss2 = await getJobQueue();
  expect(boss1).toBe(boss2);
  expect(mockStart).toHaveBeenCalledTimes(1);
});

// getJobQueue throws when DATABASE_URL is not set
test("getJobQueue throws when DATABASE_URL is missing", async () => {
  delete process.env.DATABASE_URL;
  await loadModule();
  await expect(getJobQueue()).rejects.toThrow("DATABASE_URL is required for job queue");
});

// stopJobQueue calls boss.stop() with graceful options
test("stopJobQueue calls boss.stop with graceful options", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  await loadModule();
  await getJobQueue();
  await stopJobQueue();
  expect(mockStop).toHaveBeenCalledWith({ graceful: true, timeout: 30000 });
});

// stopJobQueue resets singleton so next getJobQueue creates a new instance
test("stopJobQueue resets singleton", async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  await loadModule();
  await getJobQueue();
  await stopJobQueue();
  // After stop, calling getJobQueue should create a new instance
  await getJobQueue();
  expect(mockStart).toHaveBeenCalledTimes(2);
});

// stopJobQueue does nothing when called without prior initialization
test("stopJobQueue is a no-op when queue was not started", async () => {
  await loadModule();
  await stopJobQueue();
  expect(mockStop).not.toHaveBeenCalled();
});

// QUEUE_NAMES contains expected queue identifiers
test("QUEUE_NAMES has expected values", async () => {
  await loadModule();
  expect(QUEUE_NAMES.CLEANUP).toBe("cleanup");
  expect(QUEUE_NAMES.AUDIT_EXPORT).toBe("audit-export");
});
