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
// jobs `active`, so concurrent drains can't double-process.
//
// Failure semantics (pg-boss v12, verified against its source):
// - A thrown handler -> boss.fail(): the job retries until retry_limit (queue
//   default 2), then lands in terminal `failed`. Recovery is the explicit
//   retryFailedJob admin action (boss.retry) — failed jobs are NOT re-fetched.
// - A drain killed mid-job leaves that job `active`; it is invisible to fetch()
//   until boss.supervise() expires it (default 15 min). No interval timers run
//   in serverless (see queue.ts), so the cron backstop calls supervise()
//   explicitly — worst case a wedged job waits one cron cycle.

const DRAIN_BATCH = 10;
// Stop fetching new batches near the function-duration limit so we don't get
// killed mid-job (which would wedge it `active` until the next supervise pass).
const DRAIN_TIME_BUDGET_MS = 240_000;

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
 * throwing handler marks that job failed (retryable via the admin retry action)
 * and does not abort the rest of the batch. A queue-level error (e.g. the queue
 * missing on a fresh database) is logged and skips only that queue.
 */
export async function processPendingJobs(
  opts: { batchSize?: number; maxBatchesPerQueue?: number; timeBudgetMs?: number } = {},
): Promise<{ processed: number; failed: number }> {
  const batchSize = opts.batchSize ?? DRAIN_BATCH;
  const maxBatchesPerQueue = opts.maxBatchesPerQueue ?? 10;
  const timeBudgetMs = opts.timeBudgetMs ?? DRAIN_TIME_BUDGET_MS;
  const startedAt = Date.now();
  const boss = await getJobQueue();

  let processed = 0;
  let failed = 0;

  for (const queue of Object.values(QUEUE_NAMES)) {
    try {
      for (let batch = 0; batch < maxBatchesPerQueue; batch++) {
        if (Date.now() - startedAt > timeBudgetMs) {
          logger.warn({ queue, processed }, "Job drain stopping early: time budget reached");
          return { processed, failed };
        }
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
    } catch (error) {
      // Isolate queue-level failures so one bad queue can't starve the others.
      logger.error({ err: error, queue }, "Job drain failed for queue");
    }
  }

  return { processed, failed };
}

/** Opportunistic post-response drain; the cron endpoint is the durability backstop. */
export function scheduleJobDrain(): void {
  after(() => processPendingJobs().catch((err) => logger.error({ err }, "Job drain failed")));
}
