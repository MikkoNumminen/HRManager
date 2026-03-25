import { AuditLogSchema, AuditLogFilterSchema, AuditLog, AuditLogFilter } from "./schemas";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { Filter } from "mongodb";

// Escape special regex characters to prevent regex injection
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAuditLogs(
  filters?: Partial<AuditLogFilter>,
): Promise<{ logs: AuditLog[]; total: number }> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new ActionError("permissionDenied", "Permission denied");
  }
  const parsed = AuditLogFilterSchema.parse(filters ?? {});
  const { userEmail, action, entityType, dateFrom, dateTo, page, pageSize } = parsed;

  if (!isMongoAvailable()) {
    return { logs: [], total: 0 };
  }

  const sessionId = await getDemoSessionId();
  const col = getAuditLogCollection();
  const filter: Filter<{ sessionId: string | null }> = { sessionId };

  if (userEmail) {
    (filter as Record<string, unknown>).userEmail = {
      $regex: escapeRegex(userEmail),
      $options: "i",
    };
  }
  if (action) {
    (filter as Record<string, unknown>).action = action;
  }
  if (entityType) {
    (filter as Record<string, unknown>).entityType = entityType;
  }
  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (dateFrom) createdAtFilter.$gte = dateFrom;
    if (dateTo) createdAtFilter.$lte = dateTo;
    (filter as Record<string, unknown>).createdAt = createdAtFilter;
  }

  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    col.countDocuments(filter),
  ]);

  const logs = docs.map((doc) =>
    AuditLogSchema.parse({
      id: doc._id!.toString(),
      userId: doc.userId,
      userEmail: doc.userEmail,
      action: doc.action,
      entityType: doc.entityType,
      entityId: doc.entityId,
      before: doc.before,
      after: doc.after,
      createdAt: doc.createdAt,
    }),
  );

  return { logs, total };
}

export async function getAuditLogUserEmails(): Promise<string[]> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new ActionError("permissionDenied", "Permission denied");
  }
  if (!isMongoAvailable()) {
    return [];
  }
  const sessionId = await getDemoSessionId();
  const col = getAuditLogCollection();
  const emails = await col.distinct("userEmail", {
    userEmail: { $ne: null },
    sessionId,
  });
  return (emails as string[]).filter(Boolean).sort();
}
