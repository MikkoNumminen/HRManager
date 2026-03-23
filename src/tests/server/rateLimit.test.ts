import { testPrisma } from "./testDb";

// Mock next/server after() to execute callback immediately (no request scope in tests)
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (cb: () => Promise<void>) => cb(),
}));

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
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

// Mock next/server — after() runs callbacks immediately so audit logs are written in tests
jest.mock("next/server", () => ({
  after: (cb: () => void | Promise<void>) => cb(),
}));

import { rateLimit, rateLimitAuth, RateLimitError, cleanupExpiredRateLimits } from "@/rateLimit";

beforeEach(async () => {
  await testPrisma.rateLimit.deleteMany();
  await testPrisma.auditLog.deleteMany();
  mockHeaders.clear();
  mockHeaders.set("x-forwarded-for", "192.168.1.1");
});

afterAll(async () => {
  await testPrisma.rateLimit.deleteMany();
  await testPrisma.auditLog.deleteMany();
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

  // Verify audit log entries were created for each rate limit hit
  const auditLogs = await testPrisma.auditLog.findMany({
    where: { action: "rate_limited" },
  });
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

// Falls back to x-real-ip when x-forwarded-for is not available
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

// Handles x-forwarded-for with multiple IPs (takes the first one)
test("extracts first IP from x-forwarded-for with multiple IPs", async () => {
  mockHeaders.set("x-forwarded-for", "203.0.113.1, 70.41.3.18, 150.172.238.178");

  await rateLimit("testAction");

  const record = await testPrisma.rateLimit.findFirst();
  expect(record?.identifier).toBe("ip:203.0.113.1");
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
