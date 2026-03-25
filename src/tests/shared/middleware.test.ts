// Tests for proxy.ts tracing headers — verifies trace ID generation,
// traceparent propagation, and Server-Timing header in the proxy function.

const mockHeaders = new Map<string, string>();
const mockResponseHeaders = {
  set: jest.fn((key: string, value: string) => mockHeaders.set(key, value)),
  get: jest.fn((key: string) => mockHeaders.get(key)),
};

jest.mock("next/server", () => ({
  NextResponse: {
    next: jest.fn(() => ({ headers: mockResponseHeaders })),
    redirect: jest.fn(() => ({ headers: mockResponseHeaders })),
  },
}));

jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { proxy, config } from "@/proxy";
import type { NextRequest } from "next/server";

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers));
  return {
    headers: {
      get: (key: string) => headerMap.get(key) ?? null,
    },
    nextUrl: { pathname: "/dashboard", origin: "http://localhost:3000" },
    url: "http://localhost:3000/dashboard",
  } as unknown as NextRequest;
}

describe("proxy tracing headers", () => {
  beforeEach(() => {
    mockHeaders.clear();
    jest.clearAllMocks();
  });

  // Should generate a new trace ID when no traceparent header exists
  it("generates a 32-char hex trace ID when no traceparent header", async () => {
    const request = createMockRequest();
    await proxy(request);

    const traceId = mockHeaders.get("X-Trace-Id");
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  // Should extract trace ID from incoming traceparent header (W3C format)
  it("extracts trace ID from traceparent header", async () => {
    const request = createMockRequest({
      traceparent: "00-abcdef1234567890abcdef1234567890-1234567890abcdef-01",
    });
    await proxy(request);

    expect(mockHeaders.get("X-Trace-Id")).toBe("abcdef1234567890abcdef1234567890");
  });

  // Should add Server-Timing header with proxy duration
  it("sets Server-Timing header", async () => {
    const request = createMockRequest();
    await proxy(request);

    const timing = mockHeaders.get("Server-Timing");
    expect(timing).toBeDefined();
    expect(timing).toMatch(/^proxy;dur=\d+$/);
  });

  // Should generate unique trace IDs for different requests
  it("generates unique trace IDs across requests", async () => {
    const req1 = createMockRequest();
    const req2 = createMockRequest();

    await proxy(req1);
    const id1 = mockHeaders.get("X-Trace-Id");
    mockHeaders.clear();

    await proxy(req2);
    const id2 = mockHeaders.get("X-Trace-Id");

    expect(id1).not.toBe(id2);
  });
});

describe("proxy config", () => {
  // Should export a matcher that excludes static assets
  it("exports matcher config", () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
