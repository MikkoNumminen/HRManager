import { PgBoss } from "pg-boss";
import logger from "@/lib/logger";

// Singleton pattern — one pg-boss instance per process
let boss: PgBoss | null = null;

/**
 * Returns the shared pg-boss queue instance, creating and starting it on first call.
 * Uses a separate `pgboss` schema to avoid collisions with Prisma-managed tables.
 */
export async function getJobQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for job queue");
  }

  boss = new PgBoss({
    connectionString,
    schema: "pgboss",
    monitorIntervalSeconds: 30,
  });

  boss.on("error", (error: Error) => {
    logger.error({ err: error }, "pg-boss error");
  });

  await boss.start();
  logger.info("pg-boss job queue started");
  return boss;
}

/**
 * Gracefully stops the job queue and resets the singleton.
 * Called during process shutdown to allow in-flight jobs to finish.
 */
export async function stopJobQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30000 });
    boss = null;
    logger.info("pg-boss job queue stopped");
  }
}

/** Well-known queue names used throughout the application. */
export const QUEUE_NAMES = {
  CLEANUP: "cleanup",
  AUDIT_EXPORT: "audit-export",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
