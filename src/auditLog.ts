import { prisma } from "@/db";
import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/schemas";
import { after } from "next/server";
import { z } from "zod";

export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;

export interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Pre-captured context for deferred audit logging (captured inside tx, written after response). */
export interface DeferredAuditEntry extends AuditLogParams {
  userId: string | null;
  userEmail: string | null;
  sessionId: string | null;
}

async function getSessionUser(): Promise<{ id?: string; email?: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? undefined };
}

/**
 * Write an audit log entry directly (synchronous with request).
 * Used in contexts where after() is not available (e.g. tests, build-time).
 */
export async function logAudit({
  action,
  entityType,
  entityId,
  before,
  after: afterData,
}: AuditLogParams): Promise<void> {
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();

  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: afterData !== undefined ? JSON.stringify(afterData) : null,
      sessionId,
    },
  });
}

/**
 * Capture request context (user, sessionId) for deferred audit logging.
 * Call this inside the transaction while request context is still available,
 * then pass the result to deferAudit().
 */
export async function captureAuditContext(): Promise<{
  userId: string | null;
  userEmail: string | null;
  sessionId: string | null;
}> {
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();
  return {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    sessionId,
  };
}

/**
 * Schedule audit log writes to run after the response is sent.
 * Uses Next.js after() for non-blocking post-response processing.
 * The entries must have pre-captured context from captureAuditContext().
 */
export function deferAudit(entries: DeferredAuditEntry[]): void {
  if (entries.length === 0) return;

  after(async () => {
    try {
      await prisma.auditLog.createMany({
        data: entries.map((entry) => ({
          userId: entry.userId,
          userEmail: entry.userEmail,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          before: entry.before !== undefined ? JSON.stringify(entry.before) : null,
          after: entry.after !== undefined ? JSON.stringify(entry.after) : null,
          sessionId: entry.sessionId,
        })),
      });
    } catch (error) {
      console.error("[audit] Failed to write deferred audit entries:", error);
    }
  });
}

/**
 * Defer a single audit log entry with auto-captured context.
 * Convenience wrapper — captures user + sessionId from the current request,
 * then schedules the write via after().
 */
export async function deferAuditLog(params: AuditLogParams): Promise<void> {
  const ctx = await captureAuditContext();
  deferAudit([{ ...params, ...ctx }]);
}

export async function logPermissionDenial(permissionKey: string): Promise<void> {
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();

  after(async () => {
    try {
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
    } catch (error) {
      console.error("[audit] Failed to log permission denial:", error);
    }
  });
}

export async function logRateLimitHit(action: string, identifier: string): Promise<void> {
  const sessionId = await getDemoSessionId();

  // Hash IP-based identifiers to avoid storing raw IPs (GDPR PII concern)
  const safeIdentifier = identifier.startsWith("ip:")
    ? `ip:${Buffer.from(identifier).toString("base64").slice(0, 12)}...`
    : identifier;

  after(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: null,
          userEmail: null,
          action: "rate_limited",
          entityType: "security",
          entityId: null,
          before: null,
          after: JSON.stringify({ rateLimitedAction: action, identifier: safeIdentifier }),
          sessionId,
        },
      });
    } catch (error) {
      console.error("[audit] Failed to log rate limit hit:", error);
    }
  });
}
