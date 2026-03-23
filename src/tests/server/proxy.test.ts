/**
 * Tests for the Next.js proxy (CSP + security headers).
 *
 * The proxy generates a per-request nonce and sets Content-Security-Policy
 * along with other hardening headers on every response.
 */

import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";

// Helper: create a minimal NextRequest for testing
function makeRequest(url = "http://localhost:3000/"): NextRequest {
  return new NextRequest(new URL(url));
}

describe("proxy", () => {
  // Returns a NextResponse with CSP header set
  it("returns a response with CSP header", () => {
    const res = proxy(makeRequest());
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  // CSP header contains a nonce in the script-src directive
  it("includes nonce in script-src directive", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
  });

  // CSP allows unsafe-inline for styles (required by Emotion/MUI)
  it("allows unsafe-inline for style-src", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  // CSP restricts images to self and OAuth avatar domains
  it("restricts img-src to self and OAuth avatar domains", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain(
      "img-src 'self' https://lh3.googleusercontent.com https://avatars.githubusercontent.com data:",
    );
  });

  // CSP allows form-action to self and OAuth endpoints
  it("allows form-action for OAuth endpoints", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("form-action 'self' https://accounts.google.com https://github.com");
  });

  // CSP blocks iframes via frame-ancestors 'none'
  it("blocks iframe embedding via frame-ancestors", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("frame-ancestors 'none'");
  });

  // CSP blocks object/embed elements
  it("blocks object-src", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("object-src 'none'");
  });

  // CSP restricts base-uri to self
  it("restricts base-uri to self", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("base-uri 'self'");
  });

  // Each request gets a unique nonce (no nonce reuse)
  it("generates a unique nonce per request", () => {
    const res1 = proxy(makeRequest());
    const res2 = proxy(makeRequest());
    const csp1 = res1.headers.get("Content-Security-Policy")!;
    const csp2 = res2.headers.get("Content-Security-Policy")!;
    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    expect(nonce1).not.toBe(nonce2);
  });

  // Nonce is a valid base64 string of sufficient length (16 bytes = ~24 chars)
  it("generates a valid base64 nonce", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    const nonce = csp.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,28}$/);
  });

  // Sets X-Content-Type-Options: nosniff
  it("sets X-Content-Type-Options header", () => {
    const res = proxy(makeRequest());
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  // Sets Referrer-Policy to strict-origin-when-cross-origin
  it("sets Referrer-Policy header", () => {
    const res = proxy(makeRequest());
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  // Sets X-Frame-Options: DENY to prevent clickjacking
  it("sets X-Frame-Options header", () => {
    const res = proxy(makeRequest());
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  // Sets Permissions-Policy to disable unused browser APIs
  it("sets Permissions-Policy header", () => {
    const res = proxy(makeRequest());
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  // CSP default-src is 'self' — fallback for any unlisted directive
  it("sets default-src to self", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("default-src 'self'");
  });

  // CSP restricts connect-src and font-src to self
  it("restricts connect-src and font-src to self", () => {
    const res = proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self'");
  });

  // Proxy works on any URL path
  it("works on non-root paths", () => {
    const res = proxy(makeRequest("http://localhost:3000/admin/audit"));
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("proxy config", () => {
  // Matcher is exported for Next.js route matching
  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  // Matcher excludes static assets and images
  it("matcher excludes static files", () => {
    const source = config.matcher[0].source;
    expect(source).toContain("_next/static");
    expect(source).toContain("favicon");
  });

  // Matcher does not exclude prefetch requests — all routes get security headers
  it("matcher does not exclude prefetch requests", () => {
    expect(config.matcher[0].missing).toBeUndefined();
  });
});
