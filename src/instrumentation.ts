// Next.js instrumentation hook — runs once when the server starts.
// Initializes OpenTelemetry tracing + metrics for the Node.js runtime only.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initTelemetry } = await import("@/lib/telemetry");
    initTelemetry();
  }
}

// Next 15+ routes server-side errors (Server Components, route handlers, nested
// async work) through onRequestError. This hook was missing, so those exceptions
// never reached Sentry; forwarding them restores server-side error visibility.
export const onRequestError = Sentry.captureRequestError;
