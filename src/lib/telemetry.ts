// OpenTelemetry SDK initialization for Node.js runtime.
// Called once from src/instrumentation.ts when the server starts.
//
// Configures:
//  - OTLP trace exporter (Jaeger / Grafana / Datadog via env vars)
//  - OTLP metrics exporter (Prometheus-compatible via env vars)
//  - Auto-instrumentation for pg (PostgreSQL) and http
//  - Custom resource attributes (service name, version, environment)

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import logger from "@/lib/logger";

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  // Skip if already initialized or explicitly disabled
  if (sdk) return;
  if (process.env.OTEL_ENABLED !== "true") {
    logger.info("OpenTelemetry disabled (set OTEL_ENABLED=true to activate)");
    return;
  }

  // Enable OTEL diagnostic logging in development
  if (process.env.NODE_ENV === "development") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? "http://localhost:4318/v1/traces",
  });

  const metricExporter = new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? "http://localhost:4318/v1/metrics",
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: Number(process.env.OTEL_METRIC_EXPORT_INTERVAL ?? 60_000),
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "hrmanager",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0",
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? "development",
    }),
    traceExporter,
    metricReader,
    instrumentations: [
      // Auto-instrument PostgreSQL queries via pg driver
      new PgInstrumentation({
        enhancedDatabaseReporting: process.env.NODE_ENV !== "production",
      }),
    ],
  });

  sdk.start();
  logger.info(
    {
      traceEndpoint:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? "http://localhost:4318/v1/traces",
      metricsEndpoint:
        process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? "http://localhost:4318/v1/metrics",
    },
    "OpenTelemetry initialized",
  );

  // Graceful shutdown
  const shutdown = async () => {
    if (sdk) {
      await sdk.shutdown();
      logger.info("OpenTelemetry shut down");
    }
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export { sdk };
