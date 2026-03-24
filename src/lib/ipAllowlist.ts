import { headers } from "next/headers";
import { ActionError } from "@/actionErrors";
import { deferAuditLog } from "@/auditLog";

/**
 * Returns the client IP from request headers.
 * Vercel sets x-vercel-forwarded-for which cannot be spoofed by the client.
 * Falls back to x-forwarded-for (first IP in comma-separated list) then x-real-ip.
 * Returns null if unavailable.
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();

  const ip =
    headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;

  return ip;
}

/**
 * Throws an ActionError if ADMIN_IP_ALLOWLIST is configured and the
 * client IP is not in the allowlist.
 *
 * ADMIN_IP_ALLOWLIST: comma-separated exact IPv4 addresses, e.g. "1.2.3.4,10.0.0.5"
 * If not set or empty → allow all (opt-in enforcement).
 * Exact IPv4 match only — CIDR support is a future enhancement.
 * Logs blocked attempts to the audit log.
 */
export async function requireAdminIp(): Promise<void> {
  const allowlistEnv = process.env.ADMIN_IP_ALLOWLIST;

  // Not configured → allow all
  if (!allowlistEnv || allowlistEnv.trim() === "") {
    return;
  }

  const allowlist = allowlistEnv
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  // Empty list after parsing → allow all
  if (allowlist.length === 0) {
    return;
  }

  const clientIp = await getClientIp();

  if (clientIp !== null && allowlist.includes(clientIp)) {
    return;
  }

  // Block — log the attempt and throw
  await deferAuditLog({
    action: "ip_blocked",
    entityType: "security",
    after: { clientIp: clientIp ?? "unknown" },
  });

  throw new ActionError("ipNotAllowed", "Admin access not allowed from this IP address.");
}
