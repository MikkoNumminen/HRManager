import { prisma } from "@/db";
import {
  captureAuditContext,
  deferAudit,
  emitAuditEvents,
  type DeferredAuditEntry,
} from "@/auditLog";
import { isFeatureEnabled } from "@/lib/featureFlag";
import { auditEntriesToOutboxData, scheduleAuditDrain, AUDIT_OUTBOX_FLAG } from "@/lib/auditOutbox";
import { Prisma } from "@prisma/client";

/** Context fields automatically filled by withAuditedTransaction. */
type AuditContext = Pick<DeferredAuditEntry, "userId" | "userEmail" | "sessionId">;

/** Everything a caller must supply — the audit meta without the context fields. */
type AuditEntryInput = Omit<DeferredAuditEntry, keyof AuditContext>;

/** The callback receives the transaction client and an addAudit helper. */
type AuditedTransactionFn<T> = (
  tx: Prisma.TransactionClient,
  addAudit: (entry: AuditEntryInput) => void,
) => Promise<T>;

/**
 * Runs a Prisma transaction with automatic audit log capture.
 *
 * Captures audit context BEFORE the transaction, accumulates entries via addAudit(),
 * and persists them after commit. When the audit-use-outbox flag is ON, the entries
 * are written to the AuditOutbox table INSIDE the same transaction as the mutation —
 * so the audit is durable atomically (a Mongo outage can no longer lose it) and the
 * single drainer assigns the hash chain (no fork). When OFF, behaviour is unchanged:
 * deferAudit() writes MongoDB after the response.
 */
export async function withAuditedTransaction<T>(fn: AuditedTransactionFn<T>): Promise<T> {
  // Capture user + session context before entering the transaction so that
  // auth() / headers() calls do not run inside the PostgreSQL transaction window.
  const ctx = await captureAuditContext();
  const entries: DeferredAuditEntry[] = [];
  const useOutbox = await isFeatureEnabled(AUDIT_OUTBOX_FLAG);

  const result = await prisma.$transaction(async (tx) => {
    const value = await fn(tx, (entry: AuditEntryInput) => entries.push({ ...ctx, ...entry }));
    if (useOutbox && entries.length > 0) {
      await tx.auditOutbox.createMany({ data: auditEntriesToOutboxData(entries) });
    }
    return value;
  });

  if (useOutbox) {
    emitAuditEvents(entries);
    if (entries.length > 0) scheduleAuditDrain();
  } else {
    deferAudit(entries);
  }
  return result;
}
