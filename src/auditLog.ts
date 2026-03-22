import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { auth } from "@/auth";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "kickout"
  | "seed"
  | "reset"
  | "permission_denied"
  | "rate_limited";

export type AuditEntityType =
  | "person"
  | "team"
  | "teamMember"
  | "department"
  | "user"
  | "userPermission"
  | "auth"
  | "security";

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  tx?: Prisma.TransactionClient;
}

async function getSessionUser(): Promise<{ id?: string; email?: string } | null> {
  const session = await auth();
  return session?.user ?? null;
}

export async function logAudit({
  action,
  entityType,
  entityId,
  before,
  after,
  tx,
}: AuditLogParams): Promise<void> {
  const user = await getSessionUser();
  const client = tx ?? prisma;

  await client.auditLog.create({
    data: {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: after !== undefined ? JSON.stringify(after) : null,
    },
  });
}

export async function logPermissionDenial(permissionKey: string): Promise<void> {
  const user = await getSessionUser();
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action: "permission_denied",
      entityType: "security",
      entityId: null,
      before: null,
      after: JSON.stringify({ permissionKey }),
    },
  });
}

export async function logRateLimitHit(action: string, identifier: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: null,
      userEmail: null,
      action: "rate_limited",
      entityType: "security",
      entityId: null,
      before: null,
      after: JSON.stringify({ rateLimitedAction: action, identifier }),
    },
  });
}
