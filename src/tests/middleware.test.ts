// Tests for src/middleware.ts — verifies trace ID generation, traceparent propagation, and Server-Timing header.

// Mock NextResponse.next() to capture headers
const mockHeaders = new Map<string, string>();
const mockResponse = {
  headers: {
    set: jest.fn((key: string, value: string) => mockHeaders.set(key, value)),
    get: jest.fn((key: string) => mockHeaders.get(key)),
  },
};

jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(() => mockResponse),
  },
}));

import { middleware, config } from "@/middleware";
import type { NextRequest } from "next/server";

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    headers: {
      get: (key: string) => headerMap.get(key) ?? null,
    },
    nextUrl: { pathname: "/dashboard" },
    url: "http://localhost:3000/dashboard",
  } as unknown as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    mockHeaders.clear();
    jest.clearAllMocks();
  });

  // Should generate a new trace ID when no traceparent header exists
  it("generates a 32-char hex trace ID when no traceparent header", () => {
    const request = createMockRequest();
    middleware(request);

    const traceId = mockHeaders.get("X-Trace-Id");
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  // Should extract trace ID from incoming traceparent header (W3C format)
  it("extracts trace ID from traceparent header", () => {
    const request = createMockRequest({
      traceparent: "00-abcdef1234567890abcdef1234567890-1234567890abcdef-01",
    });
    middleware(request);

    expect(mockHeaders.get("X-Trace-Id")).toBe("abcdef1234567890abcdef1234567890");
  });

  // Should add Server-Timing header with middleware duration
  it("sets Server-Timing header", () => {
    const request = createMockRequest();
    middleware(request);

    const timing = mockHeaders.get("Server-Timing");
    expect(timing).toBeDefined();
    expect(timing).toMatch(/^middleware;dur=\d+$/);
  });

  // Should generate unique trace IDs for different requests
  it("generates unique trace IDs across requests", () => {
    const req1 = createMockRequest();
    const req2 = createMockRequest();

    middleware(req1);
    const id1 = mockHeaders.get("X-Trace-Id");
    mockHeaders.clear();

    middleware(req2);
    const id2 = mockHeaders.get("X-Trace-Id");

    expect(id1).not.toBe(id2);
  });
});

describe("middleware config", () => {
  // Should export a matcher that excludes static assets
  it("exports matcher config", () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
