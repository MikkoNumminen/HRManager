import { NextResponse } from "next/server";

// Shallow health check — confirms the application is running and responding.
// No external dependency checks; use /api/ready for deep checks.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
