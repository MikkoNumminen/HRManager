import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/schemas";
import { z } from "zod";

export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;

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
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? undefined };
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
  const sessionId = await getDemoSessionId();
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
      sessionId,
    },
  });
}

export async function logPermissionDenial(permissionKey: string): Promise<void> {
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action: "permission_denied",
      entityType: "security",
      entityId: null,
      before: null,
      after: JSON.stringify({ permissionKey }),
      sessionId,
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
