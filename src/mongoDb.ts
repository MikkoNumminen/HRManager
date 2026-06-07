import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import logger from "@/lib/logger";

export interface AuditLogDocument {
  _id?: ObjectId;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: string | null;
  after: string | null;
  sessionId: string | null;
  createdAt: Date;
  prevHash?: string | null;
  hash?: string;
}

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
};

/** Returns true when MONGODB_URL is configured and MongoDB can be used. */
export function isMongoAvailable(): boolean {
  return !!process.env.MONGODB_URL;
}

function getMongoClient(): MongoClient {
  if (!globalForMongo.mongoClient) {
    const url = process.env.MONGODB_URL;
    if (!url) {
      throw new Error("MONGODB_URL environment variable is not set");
    }
    globalForMongo.mongoClient = new MongoClient(url);
  }
  return globalForMongo.mongoClient;
}

export function getMongoDb(): Db {
  return getMongoClient().db();
}

export function getAuditLogCollection(): Collection<AuditLogDocument> {
  return getMongoDb().collection<AuditLogDocument>("auditLogs");
}

// 90-day retention window for audit logs
const AUDIT_LOG_TTL_SECONDS = 90 * 24 * 60 * 60;

// $jsonSchema validator — enforces required fields on all audit log writes.
// Uses "warn" validationAction so invalid documents are logged but not rejected,
// preventing write failures if the schema evolves before all writers are updated.
const AUDIT_LOG_SCHEMA = {
  $jsonSchema: {
    bsonType: "object",
    required: ["action", "entityType", "createdAt"],
    properties: {
      userId: { bsonType: ["string", "null"] },
      userEmail: { bsonType: ["string", "null"] },
      action: {
        bsonType: "string",
        description: "The action performed (create, update, delete, etc.)",
      },
      entityType: {
        bsonType: "string",
        description: "The entity type affected (person, team, department, etc.)",
      },
      entityId: { bsonType: ["string", "null"] },
      before: {
        bsonType: ["string", "null"],
        description: "JSON-serialized state before the action",
      },
      after: {
        bsonType: ["string", "null"],
        description: "JSON-serialized state after the action",
      },
      sessionId: { bsonType: ["string", "null"] },
      createdAt: { bsonType: "date" },
    },
  },
};

export async function ensureAuditLogIndexes(): Promise<void> {
  const db = getMongoDb();
  const col = getAuditLogCollection();

  // Apply schema validation to the collection
  try {
    await db.command({
      collMod: "auditLogs",
      validator: AUDIT_LOG_SCHEMA,
      validationLevel: "moderate",
      validationAction: "warn",
    });
  } catch {
    // Collection may not exist yet — create it with the validator
    try {
      await db.createCollection("auditLogs", {
        validator: AUDIT_LOG_SCHEMA,
        validationLevel: "moderate",
        validationAction: "warn",
      });
    } catch (error) {
      // Collection already exists but collMod failed for another reason — log with the
      // error so operators can triage (audit-log validation is a security invariant).
      logger.warn({ err: error }, "Could not apply schema validation to auditLogs collection");
    }
  }

  await Promise.all([
    col.createIndex({ userId: 1 }),
    col.createIndex({ userEmail: 1 }),
    col.createIndex({ action: 1 }),
    col.createIndex({ entityType: 1 }),
    col.createIndex({ createdAt: -1 }),
    col.createIndex({ sessionId: 1 }),
    // TTL index: MongoDB automatically deletes documents older than 90 days
    col.createIndex({ createdAt: 1 }, { expireAfterSeconds: AUDIT_LOG_TTL_SECONDS }),
  ]);
}

export async function disconnectMongo(): Promise<void> {
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
  }
}
