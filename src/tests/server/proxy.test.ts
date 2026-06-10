/**
 * Tests for the Next.js proxy (CSP + security headers).
 *
 * The proxy generates a per-request nonce and sets Content-Security-Policy
 * along with other hardening headers on every response.
 */

import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";

// Mock auth to return null session by default (no 2FA redirect)
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

// Helper: create a minimal NextRequest for testing
function makeRequest(url = "http://localhost:3000/"): NextRequest {
  return new NextRequest(new URL(url));
}

describe("proxy", () => {
  // Returns a NextResponse with CSP header set
  it("returns a response with CSP header", async () => {
    const res = await proxy(makeRequest());
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  // CSP header contains a nonce in the script-src directive
  it("includes nonce in script-src directive", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
  });

  // CSP allows unsafe-inline for styles (required by Emotion/MUI)
  it("allows unsafe-inline for style-src", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toMatch(/style-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'unsafe-inline'/);
  });

  // CSP restricts images to self and OAuth avatar domains
  it("restricts img-src to self and OAuth avatar domains", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain(
      "img-src 'self' https://lh3.googleusercontent.com https://avatars.githubusercontent.com data:",
    );
  });

  // CSP allows form-action to self and OAuth endpoints
  it("allows form-action for OAuth endpoints", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("form-action 'self' https://accounts.google.com https://github.com");
  });

  // CSP blocks iframes via frame-ancestors 'none'
  it("blocks iframe embedding via frame-ancestors", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("frame-ancestors 'none'");
  });

  // CSP blocks object/embed elements
  it("blocks object-src", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("object-src 'none'");
  });

  // CSP restricts base-uri to self
  it("restricts base-uri to self", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("base-uri 'self'");
  });

  // Each request gets a unique nonce (no nonce reuse)
  it("generates a unique nonce per request", async () => {
    const res1 = await proxy(makeRequest());
    const res2 = await proxy(makeRequest());
    const csp1 = res1.headers.get("Content-Security-Policy")!;
    const csp2 = res2.headers.get("Content-Security-Policy")!;
    const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    expect(nonce1).not.toBe(nonce2);
  });

  // Nonce is a valid base64 string of sufficient length (16 bytes = ~24 chars)
  it("generates a valid base64 nonce", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    const nonce = csp.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,28}$/);
  });

  // Sets X-Content-Type-Options: nosniff
  it("sets X-Content-Type-Options header", async () => {
    const res = await proxy(makeRequest());
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  // Sets Referrer-Policy to strict-origin-when-cross-origin
  it("sets Referrer-Policy header", async () => {
    const res = await proxy(makeRequest());
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  // Sets X-Frame-Options: DENY to prevent clickjacking
  it("sets X-Frame-Options header", async () => {
    const res = await proxy(makeRequest());
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  // Sets Permissions-Policy to disable unused browser APIs
  it("sets Permissions-Policy header", async () => {
    const res = await proxy(makeRequest());
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  // CSP default-src is 'self' — fallback for any unlisted directive
  it("sets default-src to self", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("default-src 'self'");
  });

  // CSP restricts connect-src and font-src to self
  it("restricts connect-src and font-src to self", async () => {
    const res = await proxy(makeRequest());
    const csp = res.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self'");
  });

  // Proxy works on any URL path
  it("works on non-root paths", async () => {
    const res = await proxy(makeRequest("http://localhost:3000/admin/audit"));
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  // Redirects to 2FA verification when user has 2FA enabled but not verified
  it("redirects to verify-2fa when 2FA required but not verified", async () => {
    const { auth } = require("@/auth");
    auth.mockResolvedValueOnce({
      user: { twoFactorRequired: true, twoFactorVerified: false },
    });
    const res = await proxy(makeRequest("http://localhost:3000/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toContain("/auth/verify-2fa");
  });

  // Does not redirect when 2FA is verified
  it("does not redirect when 2FA is verified", async () => {
    const { auth } = require("@/auth");
    auth.mockResolvedValueOnce({
      user: { twoFactorRequired: true, twoFactorVerified: true },
    });
    const res = await proxy(makeRequest("http://localhost:3000/dashboard"));
    expect(res.status).not.toBe(307);
    expect(res.headers.get("Content-Security-Policy")).toBeTruthy();
  });

  // Does not check 2FA for auth routes
  it("skips 2FA check for auth routes", async () => {
    const { auth } = require("@/auth");
    auth.mockResolvedValueOnce({
      user: { twoFactorRequired: true, twoFactorVerified: false },
    });
    const res = await proxy(makeRequest("http://localhost:3000/auth/signin"));
    expect(res.status).not.toBe(307);
  });

  // API routes are gated too, but with a 403 JSON instead of a page redirect.
  it("returns 403 for API routes when 2FA required but not verified", async () => {
    const { auth } = require("@/auth");
    auth.mockResolvedValueOnce({
      user: { twoFactorRequired: true, twoFactorVerified: false },
    });
    const res = await proxy(makeRequest("http://localhost:3000/api/calendar"));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Two-factor authentication required" });
  });

  // NextAuth's own /api/auth routes must stay reachable so a 2FA-required user can
  // still complete verification (session endpoint) and sign out.
  it("skips 2FA check for /api/auth routes", async () => {
    const { auth } = require("@/auth");
    auth.mockResolvedValueOnce({
      user: { twoFactorRequired: true, twoFactorVerified: false },
    });
    const res = await proxy(makeRequest("http://localhost:3000/api/auth/session"));
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(307);
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
    // @ts-expect-error — 'missing' is intentionally not part of the matcher type; assert it stays absent
    expect(config.matcher[0].missing).toBeUndefined();
  });
});
