import { hasPermission } from "@/permissions";
import { getJobQueue, QUEUE_NAMES, type QueueName } from "@/jobs/queue";
import type { JobStatusResponse, JobRecord } from "@/jobs/types";
import { prisma } from "@/db";
import logger from "@/lib/logger";

/**
 * Returns aggregated status counts for all known queues.
 * Requires admin:manage_jobs permission.
 */
export async function getJobQueueStatuses(): Promise<JobStatusResponse[]> {
  const allowed = await hasPermission("admin:manage_jobs");
  if (!allowed) throw new Error("Permission denied");

  try {
    // Ensure the pgboss schema + queues exist before querying them.
    await getJobQueue();
    // boss.getQueues() exposes no completed/failed counts, which left the admin
    // UI hard-coding failed: 0 — terminal-failed jobs were invisible. Count
    // straight from pg-boss's job table instead (read-only).
    const rows = await prisma.$queryRaw<{ name: string; state: string; count: bigint }[]>`
      SELECT name, state, count(*) AS count
      FROM pgboss.job
      WHERE name = ANY(${Object.values(QUEUE_NAMES)})
      GROUP BY name, state`;

    return Object.values(QUEUE_NAMES).map((queueName) => {
      const count = (state: string) =>
        Number(rows.find((r) => r.name === queueName && r.state === state)?.count ?? 0);
      return {
        queueName,
        counts: {
          // `retry` is a job waiting to run again — pending from the UI's view.
          created: count("created") + count("retry"),
          active: count("active"),
          completed: count("completed"),
          failed: count("failed"),
          expired: 0,
        },
      };
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to get job queue statuses");
    // Graceful degradation — return empty statuses when queue is unavailable
    return Object.values(QUEUE_NAMES).map((queueName) => ({
      queueName,
      counts: { created: 0, active: 0, completed: 0, failed: 0, expired: 0 },
    }));
  }
}

/**
 * Returns recent jobs for a given queue using findJobs().
 * Requires admin:manage_jobs permission.
 */
export async function getRecentJobs(queueName: QueueName): Promise<JobRecord[]> {
  const allowed = await hasPermission("admin:manage_jobs");
  if (!allowed) throw new Error("Permission denied");

  try {
    const boss = await getJobQueue();
    const jobs = await boss.findJobs(queueName);
    if (!jobs || jobs.length === 0) return [];

    return jobs.map((job) => ({
      id: job.id,
      name: job.name,
      state: job.state,
      data: job.data,
      output: job.output,
      createdOn: job.createdOn.toISOString(),
      startedOn: job.startedOn?.toISOString() ?? null,
      completedOn: job.completedOn?.toISOString() ?? null,
      retryCount: job.retryCount,
    }));
  } catch (error) {
    logger.error({ err: error, queueName }, "Failed to fetch recent jobs");
    return [];
  }
}

/**
 * Returns a single job's details by ID.
 * Requires admin:manage_jobs permission.
 */
export async function getJobById(queueName: QueueName, jobId: string): Promise<JobRecord | null> {
  const allowed = await hasPermission("admin:manage_jobs");
  if (!allowed) throw new Error("Permission denied");

  try {
    const boss = await getJobQueue();
    const job = await boss.getJobById(queueName, jobId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      state: job.state,
      data: job.data,
      output: job.output,
      createdOn: job.createdOn.toISOString(),
      startedOn: job.startedOn?.toISOString() ?? null,
      completedOn: job.completedOn?.toISOString() ?? null,
      retryCount: job.retryCount,
    };
  } catch (error) {
    logger.error({ err: error, jobId }, "Failed to get job by ID");
    return null;
  }
}
