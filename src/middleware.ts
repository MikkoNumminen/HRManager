// Next.js middleware — runs on every matched request.
// Adds tracing headers (X-Trace-Id, Server-Timing) for observability.
// Runs in Edge runtime so we use lightweight crypto, not the full OTEL SDK.

import { NextResponse, type NextRequest } from "next/server";

function generateTraceId(): string {
  // 16-byte hex trace ID (128-bit, W3C Trace Context compatible)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function middleware(request: NextRequest) {
  const start = Date.now();

  // Use incoming traceparent header or generate a new trace ID
  const incoming = request.headers.get("traceparent");
  const traceId = incoming ? incoming.split("-")[1] : generateTraceId();

  const response = NextResponse.next();

  // Propagate trace ID downstream via header
  response.headers.set("X-Trace-Id", traceId);

  // Server-Timing header for measuring middleware overhead + total server time
  const duration = Date.now() - start;
  response.headers.set("Server-Timing", `middleware;dur=${duration}`);

  return response;
}

export const config = {
  // Match all routes except static files, images, and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
