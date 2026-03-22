import { prisma } from "@/db";
import { headers } from "next/headers";
import { auth } from "@/auth";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per window
const AUTH_MAX_REQUESTS = 10; // 10 requests per window for auth endpoints

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}

async function getIpIdentifier(): Promise<string> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null;

  if (!ip) {
    return "anonymous";
  }
  return `ip:${ip}`;
}

async function getIdentifier(): Promise<string> {
  // Prefer user-based rate limiting for authenticated users
  const session = await auth();
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  return getIpIdentifier();
}

async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const existing = await prisma.rateLimit.findUnique({
    where: { identifier_action: { identifier, action } },
  });

  if (existing && existing.windowStart > windowStart) {
    if (existing.count >= maxRequests) {
      throw new RateLimitError();
    }
    await prisma.rateLimit.update({
      where: { identifier_action: { identifier, action } },
      data: { count: { increment: 1 } },
    });
  } else {
    await prisma.rateLimit.upsert({
      where: { identifier_action: { identifier, action } },
      update: { count: 1, windowStart: now },
      create: { identifier, action, count: 1, windowStart: now },
    });
  }
}

export async function rateLimit(action: string): Promise<void> {
  const identifier = await getIdentifier();
  await checkRateLimit(identifier, action, MAX_REQUESTS);
}

export async function rateLimitAuth(action: string): Promise<void> {
  const identifier = await getIpIdentifier();
  await checkRateLimit(identifier, `auth:${action}`, AUTH_MAX_REQUESTS);
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const result = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: windowStart } },
  });
  return result.count;
}
