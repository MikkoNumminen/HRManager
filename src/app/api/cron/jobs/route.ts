import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { processPendingJobs } from "@/jobs/drain";

// Executes pending pg-boss jobs — the durability backstop for the opportunistic
// after() drain that runs when a job is enqueued. Vercel Cron invokes this (GET,
// with an auto-added Authorization: Bearer <CRON_SECRET>); external schedulers
// can POST with the same header.
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader ?? "");
  // timingSafeEqual needs equal-length buffers; the length isn't itself secret.
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingJobs();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
