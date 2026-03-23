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

export async function ensureAuditLogIndexes(): Promise<void> {
  const col = getAuditLogCollection();
  await Promise.all([
    col.createIndex({ userId: 1 }),
    col.createIndex({ userEmail: 1 }),
    col.createIndex({ action: 1 }),
    col.createIndex({ entityType: 1 }),
    col.createIndex({ createdAt: -1 }),
    col.createIndex({ sessionId: 1 }),
  ]);
}

export async function disconnectMongo(): Promise<void> {
  if (globalForMongo.mongoClient) {
    await globalForMongo.mongoClient.close();
    globalForMongo.mongoClient = undefined;
  }
}
