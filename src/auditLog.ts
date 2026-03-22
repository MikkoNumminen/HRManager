import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { getCurrentUser } from "@/permissions";

export type AuditAction = "create" | "update" | "delete" | "kickout" | "seed" | "reset";

export type AuditEntityType =
  | "person"
  | "team"
  | "teamMember"
  | "department"
  | "user"
  | "userPermission";

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  tx?: Prisma.TransactionClient;
}

export async function logAudit({
  action,
  entityType,
  entityId,
  before,
  after,
  tx,
}: AuditLogParams): Promise<void> {
  const currentUser = await getCurrentUser();
  const client = tx ?? prisma;

  await client.auditLog.create({
    data: {
      userId: currentUser?.id ?? null,
      userEmail: currentUser?.email ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: after !== undefined ? JSON.stringify(after) : null,
    },
  });
}
