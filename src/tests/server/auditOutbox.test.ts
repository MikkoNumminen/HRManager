import { testPrisma } from "./testDb";
import {
  setupTestMongo,
  teardownTestMongo,
  cleanTestMongo,
  getTestAuditLogCollection,
} from "./testMongoDb";

// In-memory MongoDB as the audit collection; the real test Postgres for the
// AuditOutbox table and the advisory lock.
const mockIsMongoAvailable = jest.fn().mockReturnValue(true);
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testAuditLogCollection,
  isMongoAvailable: () => mockIsMongoAvailable(),
}));
jest.mock("@/db", () => ({ prisma: require("./testDb").testPrisma }));
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn() },
}));
const mockIsFeatureEnabled = jest.fn();
jest.mock("@/lib/featureFlag", () => ({
  isFeatureEnabled: (...args: unknown[]) => mockIsFeatureEnabled(...args),
}));

import {
  drainAuditOutbox,
  drainAuditOutboxBacklog,
  isAuditOutboxEnabled,
  __resetAuditOutboxFlagCache,
} from "@/lib/auditOutbox";

beforeAll(async () => {
  await setupTestMongo();
  (globalThis as Record<string, unknown>).__testAuditLogCollection = getTestAuditLogCollection();
});
afterAll(async () => {
  await teardownTestMongo();
});
beforeEach(async () => {
  mockIsMongoAvailable.mockReturnValue(true);
  await cleanTestMongo();
  await testPrisma.auditOutbox.deleteMany({});
});

const row = (over: Record<string, unknown> = {}) => ({
  action: "create",
  entityType: "person",
  sessionId: null,
  ...over,
});

describe("drainAuditOutbox", () => {
  // Pending rows move to Mongo, in order, as a linked hash chain; rows are marked drained.
  test("drains pending rows into Mongo with a linked hash chain", async () => {
    await testPrisma.auditOutbox.create({ data: row({ action: "create" }) });
    await testPrisma.auditOutbox.create({ data: row({ action: "update" }) });

    const result = await drainAuditOutbox();
    expect(result.drained).toBe(2);

    const docs = await getTestAuditLogCollection().find().sort({ _id: 1 }).toArray();
    expect(docs).toHaveLength(2);
    expect(docs[0].outboxId).toBeTruthy();
    expect(docs[1].prevHash).toBe(docs[0].hash); // chained
    expect(await testPrisma.auditOutbox.count({ where: { drainedAt: null } })).toBe(0);
  });

  // A crash after the Mongo insert but before marking drained re-drains with no duplicate.
  test("is idempotent — already-delivered rows are not duplicated on re-drain", async () => {
    const created = await testPrisma.auditOutbox.create({ data: row() });
    await drainAuditOutbox();
    // Simulate the crash window: row is in Mongo but not yet marked drained.
    await testPrisma.auditOutbox.update({ where: { id: created.id }, data: { drainedAt: null } });

    const result = await drainAuditOutbox();
    expect(result.drained).toBe(0); // skipped — already present in Mongo
    expect(await getTestAuditLogCollection().find().toArray()).toHaveLength(1); // no duplicate
  });

  // When Mongo is unavailable the rows stay durably pending in Postgres (the fix).
  test("leaves rows pending when MongoDB is unavailable", async () => {
    await testPrisma.auditOutbox.create({ data: row() });
    mockIsMongoAvailable.mockReturnValue(false);

    const result = await drainAuditOutbox();
    expect(result.drained).toBe(0);
    expect(await testPrisma.auditOutbox.count({ where: { drainedAt: null } })).toBe(1);
  });

  // The backlog loop clears more than one batch in a single run (cron catch-up).
  test("drainAuditOutboxBacklog clears a multi-batch backlog in one run", async () => {
    for (let i = 0; i < 5; i++) {
      await testPrisma.auditOutbox.create({ data: row({ action: "create" }) });
    }

    const result = await drainAuditOutboxBacklog({ batchSize: 2 });
    expect(result.drained).toBe(5);
    expect(result.batches).toBe(3); // 2 + 2 + 1
    expect(await getTestAuditLogCollection().find().toArray()).toHaveLength(5);
    expect(await testPrisma.auditOutbox.count({ where: { drainedAt: null } })).toBe(0);
  });
});

describe("isAuditOutboxEnabled", () => {
  beforeEach(() => {
    __resetAuditOutboxFlagCache();
    mockIsFeatureEnabled.mockReset();
  });

  // Repeated checks within the TTL reuse the cached value instead of re-querying.
  test("caches the flag so repeated checks don't re-query", async () => {
    mockIsFeatureEnabled.mockResolvedValue(true);

    expect(await isAuditOutboxEnabled()).toBe(true);
    expect(await isAuditOutboxEnabled()).toBe(true);

    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(1);
  });

  // Resetting the cache forces a fresh lookup (also proves test isolation works).
  test("re-queries after the cache is reset", async () => {
    mockIsFeatureEnabled.mockResolvedValue(false);
    expect(await isAuditOutboxEnabled()).toBe(false);

    __resetAuditOutboxFlagCache();
    mockIsFeatureEnabled.mockResolvedValue(true);
    expect(await isAuditOutboxEnabled()).toBe(true);

    expect(mockIsFeatureEnabled).toHaveBeenCalledTimes(2);
  });
});
