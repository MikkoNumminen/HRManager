import * as Sentry from "@sentry/nextjs";

export function captureServerActionError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}
