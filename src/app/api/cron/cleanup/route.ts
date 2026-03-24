import { NextResponse } from "next/server";
import { cleanupExpiredRateLimits } from "@/rateLimit";

// Vercel Cron or any HTTP scheduler calls this endpoint to prune expired RateLimit rows.
// Protected by CRON_SECRET to prevent unauthorized triggering.
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupExpiredRateLimits();
  return NextResponse.json({ deleted });
}
