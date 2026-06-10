import { after } from "next/server";
import type { Job } from "pg-boss";
import { getJobQueue, QUEUE_NAMES, type QueueName } from "@/jobs/queue";
import type { CleanupJobData, AuditExportJobData } from "@/jobs/types";
import { runCleanupJob } from "@/jobs/workers/cleanup";
import { runAuditExportJob } from "@/jobs/workers/auditExport";
import logger from "@/lib/logger";

// On Vercel there is no long-running process, so the boss.work() subscriptions in
// src/jobs/workers/index.ts never run — enqueued jobs sat in `created` forever
// (audit finding). This drain executes the same handlers via boss.fetch(): it is
// triggered opportunistically via after() right after a job is enqueued, with the
// CRON_SECRET-gated /api/cron/jobs route as the daily backstop. fetch() marks the
// jobs `active`, so concurrent drains can't double-process; if the function dies
// mid-job, pg-boss's expiration policy returns the job to the queue for retry.

const DRAIN_BATCH = 10;

async function runJob(queue: QueueName, job: Job<unknown>): Promise<object> {
  switch (queue) {
    case QUEUE_NAMES.CLEANUP:
      return runCleanupJob(job.data as CleanupJobData, job.id);
    case QUEUE_NAMES.AUDIT_EXPORT:
      return runAuditExportJob(job.data as AuditExportJobData, job.id);
  }
}

/**
 * Fetch and execute pending jobs across all known queues. Returns counts; a
 * failed job is marked failed in pg-boss (visible in the admin jobs UI, where it
 * can be retried) and does not abort the rest of the batch.
 */
export async function processPendingJobs(
  opts: { batchSize?: number; maxBatchesPerQueue?: number } = {},
): Promise<{ processed: number; failed: number }> {
  const batchSize = opts.batchSize ?? DRAIN_BATCH;
  const maxBatchesPerQueue = opts.maxBatchesPerQueue ?? 10;
  const boss = await getJobQueue();

  let processed = 0;
  let failed = 0;

  for (const queue of Object.values(QUEUE_NAMES)) {
    for (let batch = 0; batch < maxBatchesPerQueue; batch++) {
      const jobs = await boss.fetch(queue, { batchSize });
      if (!jobs || jobs.length === 0) break;

      for (const job of jobs) {
        try {
          const output = await runJob(queue, job);
          await boss.complete(queue, job.id, output);
          processed++;
        } catch (error) {
          logger.error({ err: error, queue, jobId: job.id }, "Job failed during drain");
          await boss.fail(queue, job.id, {
            message: error instanceof Error ? error.message : String(error),
          });
          failed++;
        }
      }

      if (jobs.length < batchSize) break;
    }
  }

  return { processed, failed };
}

/** Opportunistic post-response drain; the cron endpoint is the durability backstop. */
export function scheduleJobDrain(): void {
  after(() => processPendingJobs().catch((err) => logger.error({ err }, "Job drain failed")));
}
