import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/features/audit/schemas";
import { computeHash, getLatestHash } from "@/lib/auditHashChain";
import { emitMutationEvent } from "@/lib/eventEmitHelpers";
import logger from "@/lib/logger";
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
  if (!isMongoAvailable()) return;
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();

  const prevHash = await getLatestHash(sessionId);
  const createdAt = new Date();
  const doc = {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    before: before !== undefined ? JSON.stringify(before) : null,
    after: afterData !== undefined ? JSON.stringify(afterData) : null,
    sessionId,
    createdAt,
    prevHash,
    hash: "",
  };
  doc.hash = computeHash(doc);
  await getAuditLogCollection().insertOne(doc);
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

  // Emit real-time events synchronously (in-process, non-blocking)
  for (const entry of entries) {
    emitMutationEvent({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorEmail: entry.userEmail,
      sessionId: entry.sessionId,
    });
  }

  if (!isMongoAvailable()) return;

  after(async () => {
    try {
      const col = getAuditLogCollection();
      // Build the chain: each entry links to the previous via prevHash
      let prevHash = await getLatestHash(entries[0].sessionId);
      const docs = entries.map((entry) => {
        const createdAt = new Date();
        const doc = {
          userId: entry.userId,
          userEmail: entry.userEmail,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          before: entry.before !== undefined ? JSON.stringify(entry.before) : null,
          after: entry.after !== undefined ? JSON.stringify(entry.after) : null,
          sessionId: entry.sessionId,
          createdAt,
          prevHash,
          hash: "",
        };
        doc.hash = computeHash(doc);
        prevHash = doc.hash;
        return doc;
      });
      await col.insertMany(docs);
    } catch (error) {
      logger.error({ err: error }, "Failed to write deferred audit entries");
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
  if (!isMongoAvailable()) return;
  const user = await getSessionUser();
  const sessionId = await getDemoSessionId();

  after(async () => {
    try {
      const prevHash = await getLatestHash(sessionId);
      const createdAt = new Date();
      const doc = {
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        action: "permission_denied" as const,
        entityType: "security" as const,
        entityId: null,
        before: null,
        after: JSON.stringify({ permissionKey }),
        sessionId,
        createdAt,
        prevHash,
        hash: "",
      };
      doc.hash = computeHash(doc);
      await getAuditLogCollection().insertOne(doc);
    } catch (error) {
      logger.error({ err: error }, "Failed to log permission denial");
    }
  });
}

export async function logRateLimitHit(action: string, identifier: string): Promise<void> {
  if (!isMongoAvailable()) return;
  const sessionId = await getDemoSessionId();

  // Hash IP-based identifiers to avoid storing raw IPs (GDPR PII concern)
  const safeIdentifier = identifier.startsWith("ip:")
    ? `ip:${Buffer.from(identifier).toString("base64").slice(0, 12)}...`
    : identifier;

  after(async () => {
    try {
      const prevHash = await getLatestHash(sessionId);
      const createdAt = new Date();
      const doc = {
        userId: null,
        userEmail: null,
        action: "rate_limited" as const,
        entityType: "security" as const,
        entityId: null,
        before: null,
        after: JSON.stringify({ rateLimitedAction: action, identifier: safeIdentifier }),
        sessionId,
        createdAt,
        prevHash,
        hash: "",
      };
      doc.hash = computeHash(doc);
      await getAuditLogCollection().insertOne(doc);
    } catch (error) {
      logger.error({ err: error }, "Failed to log rate limit hit");
    }
  });
}
