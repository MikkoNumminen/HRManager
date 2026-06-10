import type { PgBoss, Job } from "pg-boss";
import { QUEUE_NAMES } from "@/jobs/queue";
import type { CleanupJobData } from "@/jobs/types";
import { cleanupExpiredRateLimits } from "@/rateLimit";
import { cleanupStaleDemoSessions } from "@/demoSession";
import logger from "@/lib/logger";

/**
 * Run one cleanup job (rate-limit and/or demo-session pruning). Plain function so
 * the long-running worker (boss.work, e.g. on k8s) and the serverless drain
 * (boss.fetch, on Vercel) execute identical logic.
 */
export async function runCleanupJob(
  data: CleanupJobData,
  jobId?: string,
): Promise<{ rateLimitDeleted: number; demoSessionsCleaned: number }> {
  const { type } = data;
  const log = logger.child({ jobId, queue: QUEUE_NAMES.CLEANUP, cleanupType: type });

  log.info("Cleanup job started");

  let rateLimitDeleted = 0;
  let demoSessionsCleaned = 0;

  if (type === "rate-limits" || type === "all") {
    rateLimitDeleted = await cleanupExpiredRateLimits();
    log.info({ rateLimitDeleted }, "Rate limit cleanup complete");
  }

  if (type === "demo-sessions" || type === "all") {
    demoSessionsCleaned = await cleanupStaleDemoSessions();
    log.info({ demoSessionsCleaned }, "Demo session cleanup complete");
  }

  log.info({ rateLimitDeleted, demoSessionsCleaned }, "Cleanup job finished");

  return { rateLimitDeleted, demoSessionsCleaned };
}

/**
 * Registers the cleanup worker that handles rate-limit and demo-session pruning.
 * Each job specifies a `type` field to select which cleanup runs.
 */
export function registerCleanupWorker(boss: PgBoss): void {
  boss.work<CleanupJobData>(QUEUE_NAMES.CLEANUP, async (jobs: Job<CleanupJobData>[]) => {
    // pg-boss delivers jobs as an array; process the first one
    const job = jobs[0];
    return runCleanupJob(job.data, job.id);
  });
}
