import type { PgBoss } from "pg-boss";
import { registerCleanupWorker } from "./cleanup";
import { registerAuditExportWorker } from "./auditExport";
import logger from "@/lib/logger";

/**
 * Registers all job workers with the given pg-boss instance.
 * Call this once after starting the queue to begin processing jobs.
 */
export function registerAllWorkers(boss: PgBoss): void {
  registerCleanupWorker(boss);
  registerAuditExportWorker(boss);
  logger.info("All job workers registered");
}
