import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { getRecentEvents } from "@/lib/eventBus";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // This route is excluded from the proxy matcher, so the 2FA gate must live here:
  // a 2FA-required user must not poll tenant events before verifying.
  if (session.user.twoFactorRequired && !session.user.twoFactorVerified) {
    return new Response("Two-factor authentication required", { status: 403 });
  }

  const sessionId = await getDemoSessionId();
  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") ?? "0");

  const events = getRecentEvents(sessionId, after);
  const cursor = events.length > 0 ? events[events.length - 1].timestamp : after;

  return NextResponse.json({ events, cursor });
}
