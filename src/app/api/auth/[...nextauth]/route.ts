import { handlers } from "@/auth";
import { rateLimitAuth, RateLimitError } from "@/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  try {
    const action = request.nextUrl.pathname.split("/").pop() ?? "auth";
    await rateLimitAuth(action);
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
