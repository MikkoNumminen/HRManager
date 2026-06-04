// Next.js instrumentation hook — runs once when the server starts.
// Initializes OpenTelemetry tracing + metrics, and (on long-running
// deployments) starts the pg-boss background job workers.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initTelemetry } = await import("@/lib/telemetry");
  initTelemetry();

  // Start background job workers only where a persistent process can poll the
  // queue (Docker / Kubernetes, signalled by WORKERS_ENABLED=true). On
  // serverless (Vercel) leave it unset — scheduled cleanup runs via the
  // /api/cron/cleanup endpoint instead, since lambdas can't host a long poller.
  if (process.env.WORKERS_ENABLED === "true") {
    const { getJobQueue, stopJobQueue } = await import("@/jobs/queue");
    const { registerAllWorkers } = await import("@/jobs/workers");

    const boss = await getJobQueue();
    registerAllWorkers(boss);

    const stop = () => {
      void stopJobQueue();
    };
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
  }
}
