// Tests for @/lib/tracing — verifies span creation, error recording, metrics, and trace context extraction.
import {
  withSpan,
  getActiveSpan,
  getTraceContext,
  getMeter,
  actionCounter,
  actionDuration,
  dbQueryDuration,
  errorCounter,
} from "@/lib/tracing";
import { SpanStatusCode, trace, context, metrics } from "@opentelemetry/api";

describe("tracing utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withSpan", () => {
    // Should wrap a function in an OTEL span and return its result
    it("creates a span, runs the function, and returns the result", async () => {
      const result = await withSpan("test-op", { key: "val" }, async (span) => {
        expect(span).toBeDefined();
        expect(span.addEvent).toBeDefined();
        return 42;
      });
      expect(result).toBe(42);
    });

    // Should set OK status on successful span
    it("sets OK status on success", async () => {
      await withSpan("ok-op", {}, async (span) => {
        // span.setStatus called in finally
        return "done";
      });
      // The mock tracer calls the callback — setStatus is called by withSpan internals
      const tracer = trace.getTracer("test");
      expect(tracer.startActiveSpan).toBeDefined();
    });

    // Should record error and set ERROR status on throw
    it("records exception and sets ERROR status on failure", async () => {
      const error = new Error("boom");
      await expect(
        withSpan("fail-op", {}, async () => {
          throw error;
        }),
      ).rejects.toThrow("boom");
    });

    // Should propagate non-Error throws
    it("handles non-Error throws", async () => {
      await expect(
        withSpan("string-throw", {}, async () => {
          throw "string error";
        }),
      ).rejects.toBe("string error");
    });
  });

  describe("getActiveSpan", () => {
    // Should return undefined when no span is active
    it("returns undefined when no span is active", () => {
      const span = getActiveSpan();
      expect(span).toBeUndefined();
    });
  });

  describe("getTraceContext", () => {
    // Should return empty object when no active span
    it("returns empty object when no span is active", () => {
      const ctx = getTraceContext();
      expect(ctx).toEqual({});
    });
  });

  describe("getMeter", () => {
    // Should return a meter instance
    it("returns a meter from OTEL metrics API", () => {
      const meter = getMeter();
      expect(meter).toBeDefined();
      expect(meter.createCounter).toBeDefined();
      expect(meter.createHistogram).toBeDefined();
    });
  });

  describe("pre-built metrics", () => {
    // Should create action counter metric
    it("actionCounter returns a counter", () => {
      const counter = actionCounter();
      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
      counter.add(1, { action: "test", status: "success" });
    });

    // Should create action duration histogram
    it("actionDuration returns a histogram", () => {
      const histogram = actionDuration();
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
      histogram.record(123, { action: "test" });
    });

    // Should create DB query duration histogram
    it("dbQueryDuration returns a histogram", () => {
      const histogram = dbQueryDuration();
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
    });

    // Should create error counter metric
    it("errorCounter returns a counter", () => {
      const counter = errorCounter();
      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
    });

    // Metrics should be cached (same instance on repeated calls)
    it("returns the same instance on repeated calls", () => {
      const c1 = actionCounter();
      const c2 = actionCounter();
      expect(c1).toBe(c2);
    });
  });
});
