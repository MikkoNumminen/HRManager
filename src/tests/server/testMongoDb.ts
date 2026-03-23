import { MongoClient, Collection } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AuditLogDocument } from "@/mongoDb";

let mongod: MongoMemoryServer;
let client: MongoClient;
export let testAuditLogCollection: Collection<AuditLogDocument>;

export async function setupTestMongo(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  testAuditLogCollection = client.db().collection<AuditLogDocument>("auditLogs");
}

export function getTestAuditLogCollection(): Collection<AuditLogDocument> {
  return testAuditLogCollection;
}

export async function cleanTestMongo(): Promise<void> {
  if (testAuditLogCollection) {
    await testAuditLogCollection.deleteMany({});
  }
}

export async function teardownTestMongo(): Promise<void> {
  await client?.close();
  await mongod?.stop();
}
