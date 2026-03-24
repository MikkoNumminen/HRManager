import { MongoClient, Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db();
});

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

// The AUDIT_LOG_SCHEMA is defined in mongoDb.ts and applied via ensureAuditLogIndexes().
// These tests verify the schema validation behavior directly against MongoDB.
const AUDIT_LOG_SCHEMA = {
  $jsonSchema: {
    bsonType: "object",
    required: ["action", "entityType", "createdAt"],
    properties: {
      userId: { bsonType: ["string", "null"] },
      userEmail: { bsonType: ["string", "null"] },
      action: { bsonType: "string" },
      entityType: { bsonType: "string" },
      entityId: { bsonType: ["string", "null"] },
      before: { bsonType: ["string", "null"] },
      after: { bsonType: ["string", "null"] },
      sessionId: { bsonType: ["string", "null"] },
      createdAt: { bsonType: "date" },
    },
  },
};

describe("MongoDB audit log schema validation", () => {
  beforeAll(async () => {
    // Create the collection with schema validation in "error" mode for testability
    await db.createCollection("auditLogsSchemaTest", {
      validator: AUDIT_LOG_SCHEMA,
      validationLevel: "strict",
      validationAction: "error",
    });
  });

  // Accepts a fully valid audit log document.
  test("accepts valid audit log document", async () => {
    const col = db.collection("auditLogsSchemaTest");
    const result = await col.insertOne({
      userId: "user-1",
      userEmail: "test@example.com",
      action: "create",
      entityType: "person",
      entityId: "p-1",
      before: null,
      after: '{"name":"Test"}',
      sessionId: null,
      createdAt: new Date(),
    });
    expect(result.insertedId).toBeDefined();
  });

  // Accepts document with null optional fields.
  test("accepts document with null optional fields", async () => {
    const col = db.collection("auditLogsSchemaTest");
    const result = await col.insertOne({
      userId: null,
      userEmail: null,
      action: "seed",
      entityType: "person",
      entityId: null,
      before: null,
      after: null,
      sessionId: null,
      createdAt: new Date(),
    });
    expect(result.insertedId).toBeDefined();
  });

  // Rejects document missing required "action" field.
  test("rejects document missing required action field", async () => {
    const col = db.collection("auditLogsSchemaTest");
    await expect(
      col.insertOne({
        entityType: "person",
        createdAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  // Rejects document missing required "entityType" field.
  test("rejects document missing required entityType field", async () => {
    const col = db.collection("auditLogsSchemaTest");
    await expect(
      col.insertOne({
        action: "create",
        createdAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  // Rejects document missing required "createdAt" field.
  test("rejects document missing required createdAt field", async () => {
    const col = db.collection("auditLogsSchemaTest");
    await expect(
      col.insertOne({
        action: "create",
        entityType: "person",
      }),
    ).rejects.toThrow();
  });

  // Rejects document with wrong type for action (number instead of string).
  test("rejects document with wrong type for action", async () => {
    const col = db.collection("auditLogsSchemaTest");
    await expect(
      col.insertOne({
        action: 123,
        entityType: "person",
        createdAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});
