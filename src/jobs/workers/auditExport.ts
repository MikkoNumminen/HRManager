import type { PgBoss, Job } from "pg-boss";
import { QUEUE_NAMES } from "@/jobs/queue";
import type { AuditExportJobData } from "@/jobs/types";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import type { AuditLogDocument } from "@/mongoDb";
import type { Filter } from "mongodb";
import logger from "@/lib/logger";

/**
 * Run one audit-export job: query MongoDB and format the results as CSV or JSON.
 * Plain function so the long-running worker (boss.work, e.g. on k8s) and the
 * serverless drain (boss.fetch, on Vercel) execute identical logic. The returned
 * object is persisted by pg-boss as the job's `output`.
 */
export async function runAuditExportJob(
  data: AuditExportJobData,
  jobId?: string,
): Promise<{ result: string; count: number }> {
  const { filters, format, sessionId } = data;
  const log = logger.child({ jobId, queue: QUEUE_NAMES.AUDIT_EXPORT, format });

  log.info("Audit export job started");

  if (!isMongoAvailable()) {
    log.warn("MongoDB not available — returning empty export");
    return { result: format === "json" ? "[]" : "", count: 0 };
  }

  // Scope to the tenant captured at enqueue time. Without this the query
  // started as {} and exported every tenant's audit logs (cross-tenant leak).
  // Coerce undefined -> null so a job enqueued before this field existed scopes
  // to org-wide logs rather than degrading to an unscoped { sessionId: undefined }.
  const query: Filter<AuditLogDocument> = { sessionId: sessionId ?? null };

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
}

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
      return runAuditExportJob(job.data, job.id);
    },
  );
}
