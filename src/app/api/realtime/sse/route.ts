import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { subscribeEvents } from "@/lib/eventBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = await getDemoSessionId();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(encoder.encode(":ok\n\n"));

      // Subscribe to events for this session
      const unsubscribe = subscribeEvents(sessionId, (event) => {
        try {
          const data = `data: ${JSON.stringify(event)}\nid: ${event.id}\nevent: ${event.type}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected — stream is closed
        }
      });

      // Heartbeat every 30 seconds to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
