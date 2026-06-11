import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { processPendingJobs } from "@/jobs/drain";
import { getJobQueue } from "@/jobs/queue";

// Generous limit so a deep post-outage backlog isn't killed mid-job; the drain
// also stops itself before its own internal time budget (drain.ts).
export const maxDuration = 300;

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

  // Maintenance first: no interval timers run in serverless (queue.ts disables
  // them), so this is the deterministic pass that expires jobs left `active` by
  // a killed drain — returning them to the queue (or failed) before we fetch.
  const boss = await getJobQueue();
  await boss.supervise();

  const result = await processPendingJobs();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
