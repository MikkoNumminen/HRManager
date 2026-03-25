"use server";

import { requirePermission } from "@/permissions";
import { rateLimit } from "@/rateLimit";
import { deferAuditLog } from "@/auditLog";
import { getJobQueue, QUEUE_NAMES, type QueueName } from "@/jobs/queue";
import type { CleanupJobData, AuditExportJobData } from "@/jobs/types";
import { CleanupJobDataSchema, AuditExportJobDataSchema } from "@/jobs/types";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { auth } from "@/auth";
import { ActionError } from "@/actionErrors";

/** Enqueue a cleanup job (rate-limits, demo-sessions, or all). */
export async function enqueueCleanupJob(
  type: CleanupJobData["type"] = "all",
): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("admin:manage_jobs");
    await rateLimit("enqueueCleanupJob");

    const parsed = CleanupJobDataSchema.parse({ type });
    const boss = await getJobQueue();
    const jobId = await boss.send(QUEUE_NAMES.CLEANUP, parsed);

    await deferAuditLog({
      action: "create",
      entityType: "job",
      entityId: jobId ?? undefined,
      after: { queue: QUEUE_NAMES.CLEANUP, type },
    });
  });
}

/** Enqueue an audit log export job. */
export async function enqueueAuditExportJob(data: {
  filters: AuditExportJobData["filters"];
  format: AuditExportJobData["format"];
}): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("admin:manage_jobs");
    await rateLimit("enqueueAuditExportJob");

    const session = await auth();
    if (!session?.user?.id) {
      throw new ActionError("notAuthenticated", "Not authenticated");
    }

    const parsed = AuditExportJobDataSchema.parse({
      userId: session.user.id,
      ...data,
    });

    const boss = await getJobQueue();
    const jobId = await boss.send(QUEUE_NAMES.AUDIT_EXPORT, parsed);

    await deferAuditLog({
      action: "export",
      entityType: "job",
      entityId: jobId ?? undefined,
      after: { queue: QUEUE_NAMES.AUDIT_EXPORT, format: data.format, filters: data.filters },
    });
  });
}

/** Retry a failed job by its ID. */
export async function retryFailedJob(queueName: QueueName, jobId: string): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("admin:manage_jobs");
    await rateLimit("retryFailedJob");
    validateUUID(jobId, "jobId");

    const boss = await getJobQueue();
    await boss.resume(queueName, jobId);

    await deferAuditLog({
      action: "update",
      entityType: "job",
      entityId: jobId,
      after: { action: "retry", queueName },
    });
  });
}

/** Cancel a pending job by its ID. */
export async function cancelJob(queueName: QueueName, jobId: string): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("admin:manage_jobs");
    await rateLimit("cancelJob");
    validateUUID(jobId, "jobId");

    const boss = await getJobQueue();
    await boss.cancel(queueName, jobId);

    await deferAuditLog({
      action: "delete",
      entityType: "job",
      entityId: jobId,
      after: { action: "cancel", queueName },
    });
  });
}
