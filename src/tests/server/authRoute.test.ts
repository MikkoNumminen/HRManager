import { NextRequest } from "next/server";

// Mock rateLimitAuth and RateLimitError before importing the route
const mockRateLimitAuth = jest.fn();
jest.mock("@/rateLimit", () => ({
  rateLimitAuth: (...args: unknown[]) => mockRateLimitAuth(...args),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests. Please try again later.");
      this.name = "RateLimitError";
    }
  },
}));

// Mock the NextAuth handlers — wrap in a delegating function to survive resets
let mockPostImpl: (req: NextRequest) => Promise<Response> = async () =>
  new Response("OK", { status: 200 });
const mockPost = jest.fn((req: NextRequest) => mockPostImpl(req));
jest.mock("@/auth", () => ({
  handlers: {
    GET: jest.fn(),
    POST: (...args: [NextRequest]) => mockPost(...args),
  },
}));

import { POST } from "@/app/api/auth/[...nextauth]/route";

beforeEach(() => {
  mockRateLimitAuth.mockReset();
  mockRateLimitAuth.mockResolvedValue(undefined);
  mockPost.mockClear();
  mockPostImpl = async () => new Response("OK", { status: 200 });
});

// Delegates to the NextAuth POST handler when rate limit passes
test("delegates to NextAuth POST handler when under rate limit", async () => {
  const request = new NextRequest("http://localhost/api/auth/callback/credentials");

  const response = await POST(request);

  expect(mockRateLimitAuth).toHaveBeenCalledWith("credentials");
  expect(mockPost).toHaveBeenCalledWith(request);
  expect(response.status).toBe(200);
});

// Returns 429 when rate limit is exceeded
test("returns 429 when auth rate limit is exceeded", async () => {
  const { RateLimitError } = require("@/rateLimit");
  mockRateLimitAuth.mockRejectedValue(new RateLimitError());

  const request = new NextRequest("http://localhost/api/auth/callback/credentials");

  const response = await POST(request);

  expect(response.status).toBe(429);
  const body = await response.json();
  expect(body.error).toBe("Too many requests. Please try again later.");
  expect(mockPost).not.toHaveBeenCalled();
});

// Extracts action name from the last path segment
test("extracts action from URL path", async () => {
  const request = new NextRequest("http://localhost/api/auth/signout");

  await POST(request);

  expect(mockRateLimitAuth).toHaveBeenCalledWith("signout");
});

// Re-throws non-RateLimitError errors
test("re-throws non-rate-limit errors", async () => {
  mockRateLimitAuth.mockRejectedValue(new Error("Database connection failed"));

  const request = new NextRequest("http://localhost/api/auth/callback/credentials");

  await expect(POST(request)).rejects.toThrow("Database connection failed");
  expect(mockPost).not.toHaveBeenCalled();
});

// Extracts the correct action for different auth endpoints
test("extracts signin action from URL", async () => {
  const request = new NextRequest("http://localhost/api/auth/signin");

  await POST(request);

  expect(mockRateLimitAuth).toHaveBeenCalledWith("signin");
});
