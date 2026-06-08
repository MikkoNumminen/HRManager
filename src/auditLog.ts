import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/features/audit/schemas";
import { computeHash, getLatestHash } from "@/lib/auditHashChain";
import { emitMutationEvent } from "@/lib/eventEmitHelpers";
import { isFeatureEnabled } from "@/lib/featureFlag";
import { auditEntriesToOutboxData, drainAuditOutbox, AUDIT_OUTBOX_FLAG } from "@/lib/auditOutbox";
import { prisma } from "@/db";
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

/** Pre-captured context for deferred audit logging (captured inside tx, written after). */
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

/** Emit in-process realtime events for audit entries (best-effort, non-durable). */
export function emitAuditEvents(entries: DeferredAuditEntry[]): void {
  for (const entry of entries) {
    emitMutationEvent({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      actorEmail: entry.userEmail,
      sessionId: entry.sessionId,
    });
  }
}

/**
 * Durably record audit entries. With the audit-use-outbox flag ON, entries go to the
 * Postgres outbox (durable even when Mongo is down) and the drainer delivers them to
 * MongoDB with the hash chain. With the flag OFF this is the legacy path: write to
 * MongoDB directly, building the chain, skipping silently if Mongo is unavailable.
 */
async function persistAuditEntries(entries: DeferredAuditEntry[]): Promise<void> {
  if (entries.length === 0) return;

  if (await isFeatureEnabled(AUDIT_OUTBOX_FLAG)) {
    await prisma.auditOutbox.createMany({ data: auditEntriesToOutboxData(entries) });
    await drainAuditOutbox();
    return;
  }

  // Legacy: direct MongoDB write with the per-batch hash chain.
  if (!isMongoAvailable()) return;
  const col = getAuditLogCollection();
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
}

/**
 * Write an audit log entry synchronously (used where after() is unavailable, e.g.
 * tests / build-time).
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const ctx = await captureAuditContext();
  await persistAuditEntries([{ ...params, ...ctx }]);
}

/**
 * Schedule audit log writes to run after the response is sent (Next.js after()).
 * Emits realtime events synchronously; the durable write happens post-response.
 */
export function deferAudit(entries: DeferredAuditEntry[]): void {
  emitAuditEvents(entries);
  if (entries.length === 0) return;

  after(async () => {
    try {
      await persistAuditEntries(entries);
    } catch (error) {
      logger.error({ err: error }, "Failed to write deferred audit entries");
    }
  });
}

/**
 * Defer a single audit log entry with auto-captured context.
 */
export async function deferAuditLog(params: AuditLogParams): Promise<void> {
  const ctx = await captureAuditContext();
  deferAudit([{ ...params, ...ctx }]);
}

export async function logPermissionDenial(permissionKey: string): Promise<void> {
  const ctx = await captureAuditContext();
  const entry: DeferredAuditEntry = {
    action: "permission_denied",
    entityType: "security",
    entityId: null,
    after: { permissionKey },
    ...ctx,
  };
  after(async () => {
    try {
      await persistAuditEntries([entry]);
    } catch (error) {
      logger.error({ err: error }, "Failed to log permission denial");
    }
  });
}

export async function logRateLimitHit(action: string, identifier: string): Promise<void> {
  const sessionId = await getDemoSessionId();

  // Hash IP-based identifiers to avoid storing raw IPs (GDPR PII concern)
  const safeIdentifier = identifier.startsWith("ip:")
    ? `ip:${Buffer.from(identifier).toString("base64").slice(0, 12)}...`
    : identifier;

  const entry: DeferredAuditEntry = {
    action: "rate_limited",
    entityType: "security",
    entityId: null,
    after: { rateLimitedAction: action, identifier: safeIdentifier },
    userId: null,
    userEmail: null,
    sessionId,
  };
  after(async () => {
    try {
      await persistAuditEntries([entry]);
    } catch (error) {
      logger.error({ err: error }, "Failed to log rate limit hit");
    }
  });
}
