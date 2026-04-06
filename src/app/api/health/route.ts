import { NextResponse } from "next/server";

// Shallow health check — confirms the application is running and responding.
// No external dependency checks; use /api/ready for deep checks.
//
// Runs on the Edge runtime: it has no Prisma / DB / Node-only deps, and Edge
// invocations spin up much faster than Node Lambdas, so health probes from
// load balancers / uptime monitors burn far less Active CPU on Vercel.
// process.uptime() isn't available on Edge — report a startup timestamp
// captured at module load instead.
export const runtime = "edge";

const startedAt = Date.now();

export function GET(): NextResponse {
  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
}
