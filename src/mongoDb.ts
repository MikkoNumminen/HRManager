import { MongoClient, Db, Collection, ObjectId } from "mongodb";

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

export async function ensureAuditLogIndexes(): Promise<void> {
  const col = getAuditLogCollection();
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
