import { NextRequest, NextResponse } from "next/server";

/**
 * Generates a random nonce for Content-Security-Policy headers.
 * Used to allow specific inline scripts (FOUC prevention) and
 * Emotion CSS-in-JS style injection while blocking all other inline code.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

/**
 * Builds a strict Content-Security-Policy header value.
 *
 * Key decisions:
 * - Nonce-based script-src: only the FOUC prevention script gets a nonce
 * - style-src uses nonce + 'unsafe-inline' fallback: Emotion/MUI injects <style>
 *   tags at runtime via AppRouterCacheProvider which sets the nonce on each tag.
 *   CSP Level 2+ browsers ignore 'unsafe-inline' when a nonce is present,
 *   giving strict nonce-based enforcement. 'unsafe-inline' remains as a fallback
 *   for older browsers that don't support nonces.
 * - img-src allows Google and GitHub avatar URLs (OAuth profile pictures)
 * - form-action allows OAuth redirect endpoints
 * - frame-ancestors 'none': this app should never be embedded in an iframe
 */
function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' https://lh3.googleusercontent.com https://avatars.githubusercontent.com data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self' https://accounts.google.com https://github.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ];

  return directives.join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Pass nonce to layout.tsx via a custom request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set security headers
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  // Run proxy on all routes except static files and images.
  // No prefetch header exclusion — all navigable routes must get security headers.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    },
  ],
};
