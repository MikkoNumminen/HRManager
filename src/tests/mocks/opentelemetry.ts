// Mock for @opentelemetry/api — prevents OTEL SDK initialization in tests.
// All spans/metrics become no-ops so tests run without a collector.

const noopSpan = {
  end: jest.fn(),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  addEvent: jest.fn(),
  setAttribute: jest.fn(),
  setAttributes: jest.fn(),
  spanContext: jest.fn(() => ({
    traceId: "00000000000000000000000000000000",
    spanId: "0000000000000000",
    traceFlags: 0,
  })),
  isRecording: jest.fn(() => false),
  updateName: jest.fn(),
};

const noopTracer = {
  startSpan: jest.fn(() => noopSpan),
  startActiveSpan: jest.fn(
    (_name: string, _options: unknown, fn?: (span: typeof noopSpan) => unknown) => {
      // startActiveSpan can be called with 2 or 3 args
      const callback = typeof _options === "function" ? _options : fn;
      return (callback as (span: typeof noopSpan) => unknown)(noopSpan);
    },
  ),
};

const noopMeter = {
  createCounter: jest.fn(() => ({ add: jest.fn() })),
  createHistogram: jest.fn(() => ({ record: jest.fn() })),
  createUpDownCounter: jest.fn(() => ({ add: jest.fn() })),
  createObservableGauge: jest.fn(() => ({ addCallback: jest.fn() })),
};

export const trace = {
  getTracer: jest.fn(() => noopTracer),
  getSpan: jest.fn(() => undefined),
  setSpan: jest.fn(),
};

export const context = {
  active: jest.fn(() => ({})),
  with: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
};

export const metrics = {
  getMeter: jest.fn(() => noopMeter),
};

export const SpanStatusCode = {
  OK: 1,
  ERROR: 2,
  UNSET: 0,
};

export const diag = {
  setLogger: jest.fn(),
};

export const DiagConsoleLogger = jest.fn();
export const DiagLogLevel = { INFO: 1 };
