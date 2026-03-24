import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Middleware: enforces 2FA verification.
 * If a user has 2FA enabled but hasn't verified yet, redirect to /auth/verify-2fa.
 * Skips API routes, static assets, auth routes, and the verify page itself.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip middleware for routes that should always be accessible
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // If user has 2FA enabled but hasn't verified, redirect to verification page
  const session = req.auth;
  if (session?.user?.twoFactorRequired && !session?.user?.twoFactorVerified) {
    const verifyUrl = new URL("/auth/verify-2fa", req.nextUrl.origin);
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes except static files and api
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
