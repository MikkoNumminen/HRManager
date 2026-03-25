// Next.js instrumentation hook — runs once when the server starts.
// Initializes OpenTelemetry tracing + metrics for the Node.js runtime only.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initTelemetry } = await import("@/lib/telemetry");
    initTelemetry();
  }
}
