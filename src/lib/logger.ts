import pino from "pino";

// Structured JSON logger using Pino.
// In development, outputs human-readable logs; in production, outputs JSON for aggregation.
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino/file",
      options: { destination: 1 }, // stdout
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  }),
  ...(process.env.NODE_ENV === "production" && {
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

export default logger;

// Create a child logger with request context (traceId, userId, action).
export function createRequestLogger(context: {
  traceId?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}) {
  return logger.child(context);
}
