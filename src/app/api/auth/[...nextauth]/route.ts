import { handlers } from "@/auth";
import { rateLimitAuth, RateLimitError } from "@/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  try {
    // Use a fixed action key so all auth POST endpoints share one rate limit
    // bucket per IP. Previously each path segment (callback, signin, etc.) got
    // its own bucket, effectively multiplying the allowed requests.
    await rateLimitAuth("auth-post");
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
    throw error;
  }
  return handlers.POST(request);
}
