import { prisma } from "@/db";
import { headers } from "next/headers";

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per window

export class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}

async function getIdentifier(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

export async function rateLimit(action: string): Promise<void> {
  const identifier = await getIdentifier();
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const existing = await prisma.rateLimit.findUnique({
    where: { identifier_action: { identifier, action } },
  });

  if (existing && existing.windowStart > windowStart) {
    if (existing.count >= MAX_REQUESTS) {
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

export async function cleanupExpiredRateLimits(): Promise<number> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const result = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: windowStart } },
  });
  return result.count;
}
