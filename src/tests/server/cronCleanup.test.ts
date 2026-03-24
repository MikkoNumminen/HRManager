// Mock @/rateLimit before importing the route
const mockCleanup = jest.fn();
jest.mock("@/rateLimit", () => ({
  cleanupExpiredRateLimits: (...args: unknown[]) => mockCleanup(...args),
}));

import { POST } from "@/app/api/cron/cleanup/route";

const VALID_SECRET = "test-cron-secret";

beforeEach(() => {
  process.env.CRON_SECRET = VALID_SECRET;
  mockCleanup.mockReset();
  mockCleanup.mockResolvedValue(0);
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/cleanup", {
    method: "POST",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

// Returns 401 when authorization header is missing
test("returns 401 when no authorization header", async () => {
  const response = await POST(makeRequest());
  expect(response.status).toBe(401);
  const body = await response.json();
  expect(body.error).toBe("Unauthorized");
  expect(mockCleanup).not.toHaveBeenCalled();
});

// Returns 401 when authorization header has wrong secret
test("returns 401 when secret is incorrect", async () => {
  const response = await POST(makeRequest("Bearer wrong-secret"));
  expect(response.status).toBe(401);
  const body = await response.json();
  expect(body.error).toBe("Unauthorized");
  expect(mockCleanup).not.toHaveBeenCalled();
});

// Returns 500 when CRON_SECRET is not configured
test("returns 500 when CRON_SECRET env var is missing", async () => {
  delete process.env.CRON_SECRET;
  const response = await POST(makeRequest(`Bearer ${VALID_SECRET}`));
  expect(response.status).toBe(500);
  const body = await response.json();
  expect(body.error).toBe("CRON_SECRET not configured");
  expect(mockCleanup).not.toHaveBeenCalled();
});

// Returns 200 with deleted count when authorized
test("returns 200 with deleted count when authorized", async () => {
  mockCleanup.mockResolvedValue(42);
  const response = await POST(makeRequest(`Bearer ${VALID_SECRET}`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.deleted).toBe(42);
  expect(mockCleanup).toHaveBeenCalledTimes(1);
});

// Returns 200 with deleted=0 when nothing to clean up
test("returns deleted=0 when nothing to clean", async () => {
  mockCleanup.mockResolvedValue(0);
  const response = await POST(makeRequest(`Bearer ${VALID_SECRET}`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.deleted).toBe(0);
});

// Returns 401 when scheme is wrong (not Bearer)
test("returns 401 when scheme is not Bearer", async () => {
  const response = await POST(makeRequest(`Basic ${VALID_SECRET}`));
  expect(response.status).toBe(401);
});
