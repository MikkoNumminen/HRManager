import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { isMongoAvailable, getAuditLogCollection } from "@/mongoDb";
import logger from "@/lib/logger";

interface DependencyStatus {
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}

// Deep readiness check — verifies all external dependencies (PostgreSQL, MongoDB)
// are reachable. Returns 503 if any required dependency is down.
export async function GET(): Promise<NextResponse> {
  const start = Date.now();

  const postgres = await checkPostgres();
  const mongodb = await checkMongoDB();

  const allOk = postgres.status === "ok" && mongodb.status === "ok";

  const body = {
    status: allOk ? "ready" : "degraded",
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    totalLatencyMs: Date.now() - start,
    dependencies: {
      postgres,
      mongodb,
    },
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}

async function checkPostgres(): Promise<DependencyStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    // Log the real error server-side; the readiness probe is reachable unauthenticated,
    // so don't leak raw DB internals (host, schema, driver details) in the response.
    logger.error({ err }, "Readiness check: PostgreSQL unreachable");
    return { status: "error", latencyMs: Date.now() - start, error: "unreachable" };
  }
}

async function checkMongoDB(): Promise<DependencyStatus> {
  const start = Date.now();
  if (!isMongoAvailable()) {
    return { status: "ok", latencyMs: 0 };
  }
  try {
    const col = getAuditLogCollection();
    await col.findOne({}, { projection: { _id: 1 } });
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    logger.error({ err }, "Readiness check: MongoDB unreachable");
    return { status: "error", latencyMs: Date.now() - start, error: "unreachable" };
  }
}
