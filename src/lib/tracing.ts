// Tracing utilities — thin wrappers around the OpenTelemetry API.
// These helpers are safe to call even when OTEL is disabled (they become no-ops).
//
// Usage:
//   import { withSpan, meter } from "@/lib/tracing";
//   const result = await withSpan("myOperation", { "attr": "value" }, async (span) => {
//     span.addEvent("step-completed");
//     return doWork();
//   });

import { trace, type Span, SpanStatusCode, context, metrics, type Meter } from "@opentelemetry/api";

const TRACER_NAME = "hrmanager";

// Get the application tracer (cached by OTEL SDK)
function getTracer() {
  return trace.getTracer(TRACER_NAME);
}

// Get the application meter for custom metrics
export function getMeter(): Meter {
  return metrics.getMeter(TRACER_NAME);
}

/**
 * Execute an async function inside a traced span.
 * Automatically sets span status and records errors.
 * Safe to call when OTEL is disabled — just runs the function.
 */
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get the current active span (if any) for adding events or attributes.
 */
export function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

/**
 * Extract trace context (traceId, spanId) from the current active span.
 * Used for correlating logs with traces.
 */
export function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
  };
}

// Pre-built metrics — lazily created on first access
let _actionCounter: ReturnType<Meter["createCounter"]> | null = null;
let _actionDuration: ReturnType<Meter["createHistogram"]> | null = null;
let _dbQueryDuration: ReturnType<Meter["createHistogram"]> | null = null;
let _errorCounter: ReturnType<Meter["createCounter"]> | null = null;

// Counter: total server actions executed
export function actionCounter() {
  if (!_actionCounter) {
    _actionCounter = getMeter().createCounter("hrm.action.count", {
      description: "Total number of server action invocations",
      unit: "invocations",
    });
  }
  return _actionCounter;
}

// Histogram: server action duration in milliseconds
export function actionDuration() {
  if (!_actionDuration) {
    _actionDuration = getMeter().createHistogram("hrm.action.duration", {
      description: "Server action execution time",
      unit: "ms",
    });
  }
  return _actionDuration;
}

// Histogram: database query duration in milliseconds
export function dbQueryDuration() {
  if (!_dbQueryDuration) {
    _dbQueryDuration = getMeter().createHistogram("hrm.db.query.duration", {
      description: "Database query execution time",
      unit: "ms",
    });
  }
  return _dbQueryDuration;
}

// Counter: errors by type
export function errorCounter() {
  if (!_errorCounter) {
    _errorCounter = getMeter().createCounter("hrm.error.count", {
      description: "Total errors by type",
      unit: "errors",
    });
  }
  return _errorCounter;
}
