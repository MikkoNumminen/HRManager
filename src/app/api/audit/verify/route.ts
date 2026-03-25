import { NextResponse } from "next/server";
import { isMongoAvailable } from "@/mongoDb";
import { verifyChain } from "@/lib/auditHashChain";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";

// Verify audit log hash chain integrity for the current session.
// Requires admin:view_audit_log permission.
export async function GET(): Promise<NextResponse> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isMongoAvailable()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }

  const sessionId = await getDemoSessionId();
  const result = await verifyChain(sessionId);

  return NextResponse.json(result, { status: result.valid ? 200 : 422 });
}
