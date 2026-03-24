import { testPrisma } from "./testDb";
import {
  setupTestMongo,
  teardownTestMongo,
  cleanTestMongo,
  getTestAuditLogCollection,
} from "./testMongoDb";

// Mock next/server after() to collect callbacks so tests can await them
const afterCallbacks: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({
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

// Mock @/mongoDb — logRateLimitHit writes audit logs to MongoDB
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testAuditLogCollection,
  isMongoAvailable: () => true,
}));

// Mock @/auth — rateLimit uses auth() to identify authenticated users
jest.mock("@/auth", () => ({
  auth: jest.fn(() => null),
}));

// Mock next/headers — provides the client IP for rate limit identification
const mockHeaders = new Map<string, string>();
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: (key: string) => mockHeaders.get(key) ?? null,
  })),
}));

// Mock @/demoSession — logRateLimitHit calls getDemoSessionId
jest.mock("@/demoSession", () => ({
  getDemoSessionId: jest.fn().mockResolvedValue(null),
}));

import { rateLimit, rateLimitAuth, RateLimitError, cleanupExpiredRateLimits } from "@/rateLimit";

beforeAll(async () => {
  await setupTestMongo();
  (globalThis as Record<string, unknown>).__testAuditLogCollection = getTestAuditLogCollection();
});

beforeEach(async () => {
  await testPrisma.rateLimit.deleteMany();
  await cleanTestMongo();
  mockHeaders.clear();
  mockHeaders.set("x-forwarded-for", "192.168.1.1");
});

afterAll(async () => {
  await testPrisma.rateLimit.deleteMany();
  await teardownTestMongo();
  await testPrisma.$disconnect();
});

// Creates a rate limit record on first request
test("creates a rate limit record on first request", async () => {
  await rateLimit("testAction");

  const records = await testPrisma.rateLimit.findMany();
  expect(records).toHaveLength(1);
  expect(records[0].identifier).toBe("ip:192.168.1.1");
  expect(records[0].action).toBe("testAction");
  expect(records[0].count).toBe(1);
});

// Increments the counter on subsequent requests within the same window
test("increments count on subsequent requests", async () => {
  await rateLimit("testAction");
  await rateLimit("testAction");
  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "testAction" } },
  });
  expect(record?.count).toBe(3);
});

// Throws RateLimitError when the limit is exceeded and logs to audit
test("throws RateLimitError when limit exceeded", async () => {
  // Seed a record at the limit
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "testAction",
      count: 30,
      windowStart: new Date(),
    },
  });

  await expect(rateLimit("testAction")).rejects.toThrow(RateLimitError);
  await expect(rateLimit("testAction")).rejects.toThrow("Too many requests");

  // Flush deferred after() callbacks so audit logs are written to MongoDB
  await flushAfterCallbacks();

  // Verify audit log entries were created for each rate limit hit (in MongoDB)
  const auditLogs = await getTestAuditLogCollection().find({ action: "rate_limited" }).toArray();
  expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  expect(JSON.parse(auditLogs[0].after!).rateLimitedAction).toBe("testAction");
});

// Allows requests after the window expires by resetting the counter
test("resets counter after window expires", async () => {
  // Seed a record with an expired window (2 minutes ago)
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "testAction",
      count: 30,
      windowStart: new Date(Date.now() - 120_000),
    },
  });

  // Should not throw — the old window is expired
  await expect(rateLimit("testAction")).resolves.toBeUndefined();

  // Counter should be reset to 1
  const record = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "testAction" } },
  });
  expect(record?.count).toBe(1);
});

// Tracks different actions independently for the same identifier
test("tracks different actions independently", async () => {
  await rateLimit("action1");
  await rateLimit("action2");
  await rateLimit("action1");

  const record1 = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "action1" } },
  });
  const record2 = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "action2" } },
  });
  expect(record1?.count).toBe(2);
  expect(record2?.count).toBe(1);
});

// Tracks different IPs independently for the same action
test("tracks different IPs independently", async () => {
  mockHeaders.set("x-forwarded-for", "10.0.0.1");
  await rateLimit("testAction");

  mockHeaders.set("x-forwarded-for", "10.0.0.2");
  await rateLimit("testAction");

  const records = await testPrisma.rateLimit.findMany({
    where: { action: "testAction" },
  });
  expect(records).toHaveLength(2);
  expect(records.every((r) => r.count === 1)).toBe(true);
});

// Prefers x-vercel-forwarded-for (spoof-proof) over x-forwarded-for
test("prefers x-vercel-forwarded-for over x-forwarded-for", async () => {
  mockHeaders.clear();
  mockHeaders.set("x-vercel-forwarded-for", "198.51.100.1");
  mockHeaders.set("x-forwarded-for", "203.0.113.99");

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:198.51.100.1");
});

// Extracts first IP from x-vercel-forwarded-for with multiple IPs
test("extracts first IP from x-vercel-forwarded-for with multiple IPs", async () => {
  mockHeaders.clear();
  mockHeaders.set("x-vercel-forwarded-for", "198.51.100.1, 10.0.0.1");

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:198.51.100.1");
});

// Falls back to x-forwarded-for when x-vercel-forwarded-for is absent
test("falls back to x-forwarded-for when Vercel header absent", async () => {
  mockHeaders.clear();
  mockHeaders.set("x-forwarded-for", "203.0.113.1, 70.41.3.18");

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:203.0.113.1");
});

// Falls back to x-real-ip when neither Vercel nor x-forwarded-for is available
test("uses x-real-ip as fallback identifier", async () => {
  mockHeaders.clear();
  mockHeaders.set("x-real-ip", "172.16.0.1");

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:172.16.0.1");
});

// Falls back to "anonymous" when no IP headers are present
test("uses 'anonymous' when no IP headers present", async () => {
  mockHeaders.clear();

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("anonymous");
});

// Falls back to count=1 when $queryRaw returns an empty array (does not throw).
test("falls back to count 1 when query returns empty result", async () => {
  const queryRawSpy = jest.spyOn(testPrisma, "$queryRaw").mockResolvedValueOnce([] as never);

  await expect(rateLimit("testAction")).resolves.toBeUndefined();
  queryRawSpy.mockRestore();
});

// RateLimitError has correct name property
test("RateLimitError has correct name and message", () => {
  const error = new RateLimitError();
  expect(error.name).toBe("RateLimitError");
  expect(error.message).toBe("Too many requests. Please try again later.");
  expect(error).toBeInstanceOf(Error);
});

// Uses user-based identifier when auth() returns a session with user.id
test("uses user-based identifier for authenticated users", async () => {
  const { auth } = require("@/auth");
  auth.mockReturnValueOnce({ user: { id: "user-abc-123" } });

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("user:user-abc-123");
});

// rateLimitAuth uses IP-only identification (never calls auth())
test("rateLimitAuth uses IP-based identifier", async () => {
  await rateLimitAuth("signin");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:192.168.1.1");
  expect(record?.action).toBe("auth:signin");
});

// rateLimitAuth uses IP even when user is authenticated (ignores auth session)
test("rateLimitAuth ignores auth session and uses IP", async () => {
  const { auth } = require("@/auth");
  auth.mockReturnValueOnce({ user: { id: "user-abc-123" } });

  await rateLimitAuth("signin");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:192.168.1.1");
  expect(record?.action).toBe("auth:signin");
});

// rateLimitAuth enforces stricter limit (10 req/min vs 30)
test("rateLimitAuth throws at 10 requests instead of 30", async () => {
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "auth:signin",
      count: 10,
      windowStart: new Date(),
    },
  });

  await expect(rateLimitAuth("signin")).rejects.toThrow(RateLimitError);
});

// rateLimitAuth allows requests under the stricter limit
test("rateLimitAuth allows requests under the 10-request limit", async () => {
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "auth:signin",
      count: 9,
      windowStart: new Date(),
    },
  });

  await expect(rateLimitAuth("signin")).resolves.toBeUndefined();
});

// rateLimitAuth falls back to anonymous when no IP headers present
test("rateLimitAuth uses anonymous when no IP headers present", async () => {
  mockHeaders.clear();

  await rateLimitAuth("signin");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("anonymous");
});

// cleanupExpiredRateLimits removes old records and returns the count
test("cleanupExpiredRateLimits removes expired records", async () => {
  // Create an expired record (2 minutes ago)
  await testPrisma.rateLimit.create({
    data: {
      identifier: "10.0.0.1",
      action: "expired",
      count: 5,
      windowStart: new Date(Date.now() - 120_000),
    },
  });

  // Create a current record
  await testPrisma.rateLimit.create({
    data: {
      identifier: "10.0.0.2",
      action: "current",
      count: 2,
      windowStart: new Date(),
    },
  });

  const deleted = await cleanupExpiredRateLimits();
  expect(deleted).toBe(1);

  const remaining = await testPrisma.rateLimit.findMany();
  expect(remaining).toHaveLength(1);
  expect(remaining[0].action).toBe("current");
});

// cleanupExpiredRateLimits returns 0 when no records to clean
test("cleanupExpiredRateLimits returns 0 when nothing to clean", async () => {
  const deleted = await cleanupExpiredRateLimits();
  expect(deleted).toBe(0);
});

// Lower boundary: count at 29 (MAX_REQUESTS - 1) increments to 30 (= limit) — request must pass.
// The existing "throws RateLimitError when limit exceeded" test covers the upper boundary (31 > 30).
test("request that brings count to exactly MAX_REQUESTS does not throw", async () => {
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "testAction",
      count: 29,
      windowStart: new Date(),
    },
  });
  // count goes from 29 → 30 (= MAX_REQUESTS, not over) — must not throw
  await expect(rateLimit("testAction")).resolves.toBeUndefined();
});

// Window expiry: record just past 60s boundary should reset (expired)
test("resets counter when window has just expired (1ms past boundary)", async () => {
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "testAction",
      count: 30,
      windowStart: new Date(Date.now() - 60_001), // 1ms past the 60s boundary
    },
  });
  await expect(rateLimit("testAction")).resolves.toBeUndefined();

  const record = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "testAction" } },
  });
  expect(record?.count).toBe(1); // window reset
});

// Window expiry: record within the window (30s) should NOT reset — count increments
test("does not reset counter when window is still active (30s elapsed)", async () => {
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "testAction",
      count: 5,
      windowStart: new Date(Date.now() - 30_000), // 30s ago — halfway through window
    },
  });
  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "testAction" } },
  });
  expect(record?.count).toBe(6); // incremented, not reset
});

// Concurrent requests: atomic SQL upsert must increment correctly under concurrent load
test("handles concurrent requests atomically — all increments registered", async () => {
  // Fire 10 concurrent requests simultaneously
  await Promise.all(Array.from({ length: 10 }, () => rateLimit("concurrentTest")));

  const record = await testPrisma.rateLimit.findUnique({
    where: { identifier_action: { identifier: "ip:192.168.1.1", action: "concurrentTest" } },
  });
  expect(record?.count).toBe(10);
});

// Concurrent requests near limit: some succeed, some throw — total count is correct
test("concurrent requests at limit — correct number of errors thrown", async () => {
  // Seed at count 25 — only 5 more requests should succeed (25+5=30 ≤ 30)
  await testPrisma.rateLimit.create({
    data: {
      identifier: "ip:192.168.1.1",
      action: "concurrentLimit",
      count: 25,
      windowStart: new Date(),
    },
  });

  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => rateLimit("concurrentLimit")),
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled").length;
  const rejected = results.filter((r) => r.status === "rejected").length;

  // 5 should pass (reaching count 30), 5 should be blocked (count > 30)
  expect(fulfilled).toBe(5);
  expect(rejected).toBe(5);
});

describe("exported rate limit constants", () => {
  // Pull the constants in after all the mocks are set up at module level.
  let constants: typeof import("@/rateLimit");

  beforeAll(async () => {
    constants = await import("@/rateLimit");
  });

  // The window should be 60 seconds — short enough to prevent abuse, long enough for normal use.
  test("RATE_LIMIT_WINDOW_MS is 60 seconds", () => {
    expect(constants.RATE_LIMIT_WINDOW_MS).toBe(60 * 1000);
  });

  // Standard authenticated users get 30 requests per window.
  test("MAX_REQUESTS_PER_WINDOW is 30", () => {
    expect(constants.MAX_REQUESTS_PER_WINDOW).toBe(30);
  });

  // Auth endpoints are stricter — 10 per window — to limit brute-force attempts.
  test("AUTH_MAX_REQUESTS is 10", () => {
    expect(constants.AUTH_MAX_REQUESTS).toBe(10);
  });
});
