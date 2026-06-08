import { createHmac } from "crypto";
import { getAuditLogCollection } from "@/mongoDb";
import type { AuditLogDocument } from "@/mongoDb";
import type { WithId } from "mongodb";

// HMAC secret for audit log hash chain integrity.
//
// In production this MUST be provided. The hash chain refuses to run with the
// baked-in development key, because a key that ships in the public source gives
// no tamper protection at all — anyone could forge entries the verifier accepts.
// Outside production we fall back to a dev-only key so the feature works out of
// the box for local development and tests.
const DEV_HMAC_SECRET = "dev-audit-hmac-secret-change-in-production";

function getHmacSecret(): string {
  const secret = process.env.AUDIT_HMAC_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUDIT_HMAC_SECRET is not set. The audit-log hash chain will not run in " +
        "production with the built-in development key (it provides no tamper " +
        "detection). Set AUDIT_HMAC_SECRET to a strong random value.",
    );
  }
  return DEV_HMAC_SECRET;
}

// Compute the canonical string representation of a log entry for hashing.
// Field order is fixed to ensure deterministic hashing.
function canonicalize(doc: {
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: string | null;
  after: string | null;
  sessionId: string | null;
  createdAt: Date;
  prevHash: string | null;
}): string {
  return JSON.stringify([
    doc.userId,
    doc.userEmail,
    doc.action,
    doc.entityType,
    doc.entityId,
    doc.before,
    doc.after,
    doc.sessionId,
    doc.createdAt.toISOString(),
    doc.prevHash,
  ]);
}

// Compute HMAC-SHA256 of the canonical log entry.
export function computeHash(doc: {
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: string | null;
  after: string | null;
  sessionId: string | null;
  createdAt: Date;
  prevHash: string | null;
}): string {
  const hmac = createHmac("sha256", getHmacSecret());
  hmac.update(canonicalize(doc));
  return hmac.digest("hex");
}

// Get the hash of the most recent audit log entry for a given session.
// Returns null if no entries exist (genesis).
export async function getLatestHash(sessionId: string | null): Promise<string | null> {
  const col = getAuditLogCollection();
  const latest = await col.findOne({ sessionId }, { sort: { _id: -1 }, projection: { hash: 1 } });
  return (latest as WithId<AuditLogDocument & { hash?: string }> | null)?.hash ?? null;
}

export interface VerificationResult {
  valid: boolean;
  totalEntries: number;
  verifiedEntries: number;
  firstBrokenAt?: {
    id: string;
    index: number;
    createdAt: string;
    expected: string;
    actual: string;
  };
}

// Walk the full hash chain for a session and verify integrity.
export async function verifyChain(sessionId: string | null): Promise<VerificationResult> {
  const col = getAuditLogCollection();
  // Order by _id (assigned by the single drainer in chain order) — robust to a row
  // whose event-time createdAt disagrees with insertion order under the outbox.
  const docs = await col.find({ sessionId }).sort({ _id: 1 }).toArray();

  const entries = docs as Array<WithId<AuditLogDocument & { prevHash?: string; hash?: string }>>;
  let prevChainHash: string | null = null;
  let chainStarted = false;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Skip entries that predate the hash chain (no hash field)
    if (!entry.hash) continue;

    const expected = computeHash({
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      sessionId: entry.sessionId,
      createdAt: entry.createdAt,
      prevHash: entry.prevHash ?? null,
    });

    if (expected !== entry.hash) {
      return {
        valid: false,
        totalEntries: entries.length,
        verifiedEntries: i,
        firstBrokenAt: {
          id: entry._id.toString(),
          index: i,
          createdAt: entry.createdAt.toISOString(),
          expected,
          actual: entry.hash,
        },
      };
    }

    // Linkage: each entry must chain to the previous entry's hash. This catches a
    // deleted middle entry or a forked chain — which the per-entry check above
    // (validating only a doc's own internal consistency) cannot detect.
    if (chainStarted && (entry.prevHash ?? null) !== prevChainHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        verifiedEntries: i,
        firstBrokenAt: {
          id: entry._id.toString(),
          index: i,
          createdAt: entry.createdAt.toISOString(),
          expected: prevChainHash ?? "(genesis)",
          actual: entry.prevHash ?? "(null)",
        },
      };
    }
    prevChainHash = entry.hash;
    chainStarted = true;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    verifiedEntries: entries.filter((e) => e.hash).length,
  };
}
