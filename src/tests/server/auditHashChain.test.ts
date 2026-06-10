import { MongoClient, Collection } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AuditLogDocument } from "@/mongoDb";

let mongod: MongoMemoryServer;
let client: MongoClient;
let col: Collection<AuditLogDocument>;

// Mock @/mongoDb to use the in-memory test collection
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testHashChainCol,
  isMongoAvailable: () => true,
}));

import { computeHash, getLatestHash, verifyChain } from "@/lib/auditHashChain";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  col = client.db().collection<AuditLogDocument>("auditLogs");
  (globalThis as Record<string, unknown>).__testHashChainCol = col;
});

beforeEach(async () => {
  await col.deleteMany({});
});

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

// Helper to create a valid hashed audit log entry.
async function insertHashedEntry(
  overrides: Partial<AuditLogDocument & { prevHash: string | null; hash: string }> = {},
): Promise<string> {
  const prevHash = await getLatestHash(overrides.sessionId ?? null);
  const createdAt = new Date();
  const doc = {
    userId: null,
    userEmail: null,
    action: "create",
    entityType: "person",
    entityId: null,
    before: null,
    after: null,
    sessionId: null,
    createdAt,
    prevHash,
    hash: "",
    ...overrides,
  };
  doc.hash = overrides.hash ?? computeHash(doc);
  const result = await col.insertOne(doc as AuditLogDocument);
  return result.insertedId.toString();
}

describe("computeHash", () => {
  // Produces a 64-character hex string (SHA-256 output).
  test("produces consistent 64-char hex hash", () => {
    const doc = {
      userId: "u-1",
      userEmail: "test@example.com",
      action: "create",
      entityType: "person",
      entityId: "p-1",
      before: null,
      after: '{"name":"Test"}',
      sessionId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      prevHash: null,
    };
    const hash = computeHash(doc);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  // Same input always produces the same hash (deterministic).
  test("is deterministic — same input yields same hash", () => {
    const doc = {
      userId: null,
      userEmail: null,
      action: "seed",
      entityType: "person",
      entityId: null,
      before: null,
      after: null,
      sessionId: "sess-1",
      createdAt: new Date("2026-03-01T12:00:00Z"),
      prevHash: null,
    };
    expect(computeHash(doc)).toBe(computeHash(doc));
  });

  // Different prevHash produces a different hash (chain linkage).
  test("different prevHash produces different hash", () => {
    const base = {
      userId: null,
      userEmail: null,
      action: "create",
      entityType: "person",
      entityId: null,
      before: null,
      after: null,
      sessionId: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    const hash1 = computeHash({ ...base, prevHash: null });
    const hash2 = computeHash({ ...base, prevHash: "abc123" });
    expect(hash1).not.toBe(hash2);
  });
});

describe("getLatestHash", () => {
  // Returns null when no entries exist (genesis).
  test("returns null when collection is empty", async () => {
    const hash = await getLatestHash(null);
    expect(hash).toBeNull();
  });

  // Returns the hash of the most recent entry.
  test("returns hash of the most recent entry", async () => {
    await insertHashedEntry({ action: "create" });
    await insertHashedEntry({ action: "update" });

    const latest = await getLatestHash(null);
    expect(latest).toBeDefined();
    expect(typeof latest).toBe("string");
  });
});

describe("verifyChain", () => {
  // Empty chain is valid.
  test("returns valid for empty chain", async () => {
    const result = await verifyChain(null);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
    expect(result.verifiedEntries).toBe(0);
  });

  // Valid chain with multiple entries passes verification.
  test("verifies a valid 3-entry chain", async () => {
    await insertHashedEntry({ action: "create", entityType: "person" });
    await insertHashedEntry({ action: "update", entityType: "person" });
    await insertHashedEntry({ action: "delete", entityType: "person" });

    const result = await verifyChain(null);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(3);
    expect(result.verifiedEntries).toBe(3);
  });

  // Detects tampered entry (modified action field).
  test("detects tampered entry", async () => {
    await insertHashedEntry({ action: "create", entityType: "person" });
    const id = await insertHashedEntry({ action: "update", entityType: "person" });
    await insertHashedEntry({ action: "delete", entityType: "person" });

    // Tamper with the second entry
    const { ObjectId } = require("mongodb");
    await col.updateOne({ _id: new ObjectId(id) }, { $set: { action: "TAMPERED" } });

    const result = await verifyChain(null);
    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt).toBeDefined();
    expect(result.firstBrokenAt!.index).toBe(1);
  });

  // Detects broken chain link (modified prevHash).
  test("detects broken chain link", async () => {
    await insertHashedEntry({ action: "create" });
    const id = await insertHashedEntry({ action: "update" });

    // Break the chain by modifying prevHash
    const { ObjectId } = require("mongodb");
    await col.updateOne({ _id: new ObjectId(id) }, { $set: { prevHash: "broken" } });

    const result = await verifyChain(null);
    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt!.index).toBe(1);
  });

  // Deleting a middle entry breaks the chain LINKAGE — the per-entry hash check
  // alone can't catch this (each surviving doc is still internally consistent).
  test("detects a deleted middle entry via linkage", async () => {
    await insertHashedEntry({ action: "create" });
    const id = await insertHashedEntry({ action: "update" });
    await insertHashedEntry({ action: "delete" });

    const { ObjectId } = require("mongodb");
    await col.deleteOne({ _id: new ObjectId(id) });

    const result = await verifyChain(null);
    expect(result.valid).toBe(false);
    expect(result.firstBrokenAt).toBeDefined();
  });

  // Skips legacy entries without hash field.
  test("skips legacy entries without hash field", async () => {
    // Insert a legacy entry without hash
    await col.insertOne({
      userId: null,
      userEmail: null,
      action: "create",
      entityType: "person",
      entityId: null,
      before: null,
      after: null,
      sessionId: null,
      createdAt: new Date("2025-01-01"),
    });
    // Insert a new hashed entry
    await insertHashedEntry({ action: "update" });

    const result = await verifyChain(null);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(2);
    expect(result.verifiedEntries).toBe(1);
  });
});

describe("getHmacSecret production safety", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_SECRET = process.env.AUDIT_HMAC_SECRET;

  const sampleDoc = {
    userId: null,
    userEmail: null,
    action: "create",
    entityType: "person",
    entityId: null,
    before: null,
    after: null,
    sessionId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    prevHash: null,
  };

  afterEach(() => {
    // NODE_ENV is typed read-only by Next.js, so write through a cast
    (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.AUDIT_HMAC_SECRET;
    } else {
      process.env.AUDIT_HMAC_SECRET = ORIGINAL_SECRET;
    }
  });

  // In production a missing secret must fail closed rather than silently using
  // the world-readable dev key, which would make tamper detection meaningless.
  test("computeHash throws in production when AUDIT_HMAC_SECRET is unset", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.AUDIT_HMAC_SECRET;
    expect(() => computeHash(sampleDoc)).toThrow(/AUDIT_HMAC_SECRET/);
  });

  // With the secret provided, production hashing works normally.
  test("computeHash works in production when AUDIT_HMAC_SECRET is set", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.AUDIT_HMAC_SECRET = "a-strong-production-secret";
    expect(computeHash(sampleDoc)).toMatch(/^[0-9a-f]{64}$/);
  });

  // Outside production the dev fallback keeps local dev and tests working.
  test("falls back to the dev key outside production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.AUDIT_HMAC_SECRET;
    expect(() => computeHash(sampleDoc)).not.toThrow();
  });
});
