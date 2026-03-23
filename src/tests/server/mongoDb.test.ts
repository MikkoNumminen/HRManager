import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer;
let originalMongoUrl: string | undefined;

// Store the real globalThis.mongoClient ref so we can clean it between tests
const globalForMongo = globalThis as unknown as {
  mongoClient: import("mongodb").MongoClient | undefined;
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  originalMongoUrl = process.env.MONGODB_URL;
  process.env.MONGODB_URL = mongod.getUri();
});

afterEach(async () => {
  // Disconnect and clear singleton between tests
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
  }
  // Reset module cache so each test gets a fresh import
  jest.resetModules();
});

afterAll(async () => {
  process.env.MONGODB_URL = originalMongoUrl;
  await mongod?.stop();
});

describe("mongoDb", () => {
  // getMongoDb returns a Db instance connected to the MongoDB server.
  test("getMongoDb returns a Db instance", async () => {
    const { getMongoDb } = await import("@/mongoDb");
    const db = getMongoDb();
    expect(db).toBeDefined();
    expect(typeof db.collection).toBe("function");
  });

  // getAuditLogCollection returns a collection named "auditLogs".
  test("getAuditLogCollection returns the auditLogs collection", async () => {
    const { getAuditLogCollection } = await import("@/mongoDb");
    const col = getAuditLogCollection();
    expect(col.collectionName).toBe("auditLogs");
  });

  // Calling getMongoDb twice reuses the same MongoClient (singleton).
  test("reuses the same MongoClient across calls (singleton)", async () => {
    const { getMongoDb } = await import("@/mongoDb");
    getMongoDb();
    const client1 = globalForMongo.mongoClient;
    getMongoDb();
    const client2 = globalForMongo.mongoClient;
    expect(client1).toBe(client2);
  });

  // Throws when MONGODB_URL is not set.
  test("throws when MONGODB_URL is missing", async () => {
    const saved = process.env.MONGODB_URL;
    delete process.env.MONGODB_URL;
    try {
      const { getMongoDb } = await import("@/mongoDb");
      expect(() => getMongoDb()).toThrow("MONGODB_URL environment variable is not set");
    } finally {
      process.env.MONGODB_URL = saved;
    }
  });

  // ensureAuditLogIndexes creates indexes on the auditLogs collection.
  test("ensureAuditLogIndexes creates indexes", async () => {
    const { ensureAuditLogIndexes, getAuditLogCollection } = await import("@/mongoDb");
    await ensureAuditLogIndexes();

    const indexes = await getAuditLogCollection().indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx.key)).flat();
    expect(indexKeys).toContain("userId");
    expect(indexKeys).toContain("userEmail");
    expect(indexKeys).toContain("action");
    expect(indexKeys).toContain("entityType");
    expect(indexKeys).toContain("createdAt");
    expect(indexKeys).toContain("sessionId");
  });

  // disconnectMongo closes the client and clears the singleton.
  test("disconnectMongo closes client and clears singleton", async () => {
    const { getMongoDb, disconnectMongo } = await import("@/mongoDb");
    // Trigger client creation
    getMongoDb();
    expect(globalForMongo.mongoClient).toBeDefined();

    await disconnectMongo();
    expect(globalForMongo.mongoClient).toBeUndefined();
  });

  // disconnectMongo is safe to call when no client exists.
  test("disconnectMongo is a no-op when no client exists", async () => {
    expect(globalForMongo.mongoClient).toBeUndefined();
    const { disconnectMongo } = await import("@/mongoDb");
    await disconnectMongo(); // should not throw
    expect(globalForMongo.mongoClient).toBeUndefined();
  });
});
