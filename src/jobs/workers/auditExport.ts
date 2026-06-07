import type { PgBoss, Job } from "pg-boss";
import { QUEUE_NAMES } from "@/jobs/queue";
import type { AuditExportJobData } from "@/jobs/types";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import type { AuditLogDocument } from "@/mongoDb";
import type { Filter } from "mongodb";
import logger from "@/lib/logger";

/**
 * Registers the audit-export worker that queries MongoDB and formats
 * the results as CSV or JSON. The formatted output is stored as the
 * job's return value, which pg-boss persists as `output`.
 */
export function registerAuditExportWorker(boss: PgBoss): void {
  boss.work<AuditExportJobData>(
    QUEUE_NAMES.AUDIT_EXPORT,
    async (jobs: Job<AuditExportJobData>[]) => {
      // pg-boss delivers jobs as an array; process the first one
      const job = jobs[0];
      const { filters, format, sessionId } = job.data;
      const log = logger.child({ jobId: job.id, queue: QUEUE_NAMES.AUDIT_EXPORT, format });

      log.info("Audit export job started");

      if (!isMongoAvailable()) {
        log.warn("MongoDB not available — returning empty export");
        return { result: format === "json" ? "[]" : "", count: 0 };
      }

      // Scope to the tenant captured at enqueue time. Without this the query
      // started as {} and exported every tenant's audit logs (cross-tenant leak).
      const query: Filter<AuditLogDocument> = { sessionId };

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }
      if (filters.action) query.action = filters.action;
      if (filters.entityType) query.entityType = filters.entityType;

      const col = getAuditLogCollection();
      const docs = await col.find(query).sort({ createdAt: -1 }).limit(10000).toArray();

      log.info({ docCount: docs.length }, "Audit logs fetched");

      let result: string;

      if (format === "json") {
        result = JSON.stringify(
          docs.map((doc) => ({
            id: doc._id?.toString(),
            userId: doc.userId,
            userEmail: doc.userEmail,
            action: doc.action,
            entityType: doc.entityType,
            entityId: doc.entityId,
            before: doc.before,
            after: doc.after,
            createdAt: doc.createdAt.toISOString(),
          })),
        );
      } else {
        const headers = [
          "id",
          "userId",
          "userEmail",
          "action",
          "entityType",
          "entityId",
          "before",
          "after",
          "createdAt",
        ];
        const rows = docs.map((doc) =>
          [
            doc._id?.toString() ?? "",
            doc.userId ?? "",
            doc.userEmail ?? "",
            doc.action,
            doc.entityType,
            doc.entityId ?? "",
            (doc.before ?? "").replace(/"/g, '""'),
            (doc.after ?? "").replace(/"/g, '""'),
            doc.createdAt.toISOString(),
          ]
            .map((v) => `"${v}"`)
            .join(","),
        );
        result = [headers.join(","), ...rows].join("\n");
      }

      log.info({ count: docs.length, format }, "Audit export job finished");
      return { result, count: docs.length };
    },
  );
}
