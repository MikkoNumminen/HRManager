import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { getAuditLogCollection, isMongoAvailable, type AuditLogDocument } from "@/mongoDb";
import { computeHash, getLatestHash } from "@/lib/auditHashChain";
import logger from "@/lib/logger";
import { isFeatureEnabled } from "@/lib/featureFlag";
import type { DeferredAuditEntry } from "@/auditLog";

// Constant key for the global advisory lock — exactly one audit drainer runs at a
// time across all triggers (after(), cron, parallel invocations), so getLatestHash
// + insert can never interleave and the chain can't fork.
const DRAIN_LOCK_KEY = 728_341;
const DRAIN_BATCH = 500;

/** Feature flag that routes audit writes through the transactional Postgres outbox. */
export const AUDIT_OUTBOX_FLAG = "audit-use-outbox";

let flagCache: { value: boolean; at: number } | null = null;
const FLAG_TTL_MS = 5_000;

/**
 * Whether audit writes should use the outbox. Cached briefly so the per-mutation
 * flag check isn't a DB round-trip on every audited request (a flip propagates
 * within the TTL; a FEATURE_FLAG_AUDIT_USE_OUTBOX env var short-circuits the lookup).
 */
export async function isAuditOutboxEnabled(): Promise<boolean> {
  const now = Date.now();
  if (flagCache && now - flagCache.at < FLAG_TTL_MS) return flagCache.value;
  const value = await isFeatureEnabled(AUDIT_OUTBOX_FLAG);
  flagCache = { value, at: now };
  return value;
}

/** Test-only: clear the cached flag so each test starts from a known state. */
export function __resetAuditOutboxFlagCache(): void {
  flagCache = null;
}

/** Map captured audit entries to AuditOutbox rows (before/after stored as JSON, as in Mongo). */
export function auditEntriesToOutboxData(
  entries: DeferredAuditEntry[],
): Prisma.AuditOutboxCreateManyInput[] {
  return entries.map((e) => ({
    userId: e.userId,
    userEmail: e.userEmail,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    before: e.before !== undefined ? JSON.stringify(e.before) : null,
    after: e.after !== undefined ? JSON.stringify(e.after) : null,
    sessionId: e.sessionId,
  }));
}

/**
 * Drain pending AuditOutbox rows into the MongoDB auditLogs collection, assigning
 * the hash chain. A transaction-scoped Postgres advisory lock makes the drainer the
 * single Mongo writer (no fork); the Mongo outboxId partial-unique index makes a
 * re-drain after a crash idempotent. Returns the number of newly inserted docs.
 */
export async function drainAuditOutbox(
  batchSize = DRAIN_BATCH,
): Promise<{ drained: number; processed: number; hasMore: boolean; skipped?: boolean }> {
  if (!isMongoAvailable()) return { drained: 0, processed: 0, hasMore: false };

  return prisma.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${DRAIN_LOCK_KEY}::bigint) AS locked`;
      if (!lock[0]?.locked) return { drained: 0, processed: 0, hasMore: false, skipped: true };

      // Fetch one extra row to learn whether more remain — so the backlog loop can
      // stop without a trailing empty drain when the queue is an exact multiple.
      const fetched = await tx.auditOutbox.findMany({
        where: { drainedAt: null },
        orderBy: { id: "asc" },
        take: batchSize + 1,
      });
      const hasMore = fetched.length > batchSize;
      const rows = hasMore ? fetched.slice(0, batchSize) : fetched;
      if (rows.length === 0) return { drained: 0, processed: 0, hasMore: false };

      const col = getAuditLogCollection();

      // A crash between the Mongo insert and the drainedAt update could leave some
      // rows already delivered (a prefix in id order) — skip them on re-drain.
      const ids = rows.map((r) => r.id.toString());
      const existing = await col
        .find({ outboxId: { $in: ids } }, { projection: { outboxId: 1 } })
        .toArray();
      const delivered = new Set(existing.map((d) => (d as { outboxId?: string | null }).outboxId));

      // Group undelivered rows by session (id order preserved) and chain each session.
      // Map keys may be null — a null sessionId is its own org-wide chain.
      const bySession = new Map<string | null, typeof rows>();
      for (const r of rows) {
        if (delivered.has(r.id.toString())) continue;
        const group = bySession.get(r.sessionId);
        if (group) group.push(r);
        else bySession.set(r.sessionId, [r]);
      }

      let inserted = 0;
      for (const group of bySession.values()) {
        let prevHash = await getLatestHash(group[0].sessionId);
        const docs: AuditLogDocument[] = group.map((r) => {
          const hash = computeHash({
            userId: r.userId,
            userEmail: r.userEmail,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            before: r.before,
            after: r.after,
            sessionId: r.sessionId,
            createdAt: r.createdAt,
            prevHash,
          });
          const doc: AuditLogDocument = {
            outboxId: r.id.toString(),
            userId: r.userId,
            userEmail: r.userEmail,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            before: r.before,
            after: r.after,
            sessionId: r.sessionId,
            createdAt: r.createdAt,
            prevHash,
            hash,
          };
          prevHash = hash;
          return doc;
        });
        await col.insertMany(docs, { ordered: true });
        inserted += docs.length;
      }

      // Mark every selected row drained (delivered now or already).
      await tx.auditOutbox.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { drainedAt: new Date() },
      });

      return { drained: inserted, processed: rows.length, hasMore };
    },
    { timeout: 20_000 },
  );
}

/**
 * Drain the whole pending backlog by looping until a batch comes back short (queue
 * empty) or another drainer holds the lock — capped at maxBatches as a safety bound.
 * Used by the cron backstop so a post-outage backlog clears in one run, not one
 * batch per cron tick.
 */
export async function drainAuditOutboxBacklog(
  opts: { batchSize?: number; maxBatches?: number } = {},
): Promise<{ drained: number; batches: number }> {
  const batchSize = opts.batchSize ?? DRAIN_BATCH;
  const maxBatches = opts.maxBatches ?? 50;
  let drained = 0;
  let batches = 0;
  while (batches < maxBatches) {
    const res = await drainAuditOutbox(batchSize);
    batches++;
    drained += res.drained;
    if (res.skipped || !res.hasMore) break;
  }
  return { drained, batches };
}

/** Opportunistic drain after the response; the cron endpoint is the durability backstop. */
export function scheduleAuditDrain(): void {
  after(() =>
    drainAuditOutbox().catch((err) => logger.error({ err }, "Audit outbox drain failed")),
  );
}
