// Tests for @/lib/telemetry — verifies SDK initialization behavior and env var gating.

// Mock the heavy OTEL SDK modules to avoid real connections
const mockStart = jest.fn();
const mockShutdown = jest.fn().mockResolvedValue(undefined);
const MockNodeSDK = jest.fn().mockImplementation(() => ({
  start: mockStart,
  shutdown: mockShutdown,
}));

jest.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: MockNodeSDK,
}));

jest.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: jest.fn(),
}));

jest.mock("@opentelemetry/exporter-metrics-otlp-http", () => ({
  OTLPMetricExporter: jest.fn(),
}));

jest.mock("@opentelemetry/sdk-metrics", () => ({
  PeriodicExportingMetricReader: jest.fn(),
}));

jest.mock("@opentelemetry/resources", () => ({
  Resource: jest.fn(),
}));

jest.mock("@opentelemetry/semantic-conventions", () => ({
  ATTR_SERVICE_NAME: "service.name",
  ATTR_SERVICE_VERSION: "service.version",
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME: "deployment.environment.name",
}));

jest.mock("@opentelemetry/instrumentation-pg", () => ({
  PgInstrumentation: jest.fn(),
}));

const mockLoggerInfo = jest.fn();
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("telemetry", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    MockNodeSDK.mockClear();
    mockStart.mockClear();
    mockLoggerInfo.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Should not initialize SDK when OTEL_ENABLED is not set
  it("does not start SDK when OTEL_ENABLED is not true", async () => {
    delete process.env.OTEL_ENABLED;
    const { initTelemetry } = await import("@/lib/telemetry");
    initTelemetry();

    expect(MockNodeSDK).not.toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining("OpenTelemetry disabled"));
  });

  // Should initialize SDK when OTEL_ENABLED=true
  it("starts SDK when OTEL_ENABLED is true", async () => {
    process.env.OTEL_ENABLED = "true";
    const { initTelemetry } = await import("@/lib/telemetry");
    initTelemetry();

    expect(MockNodeSDK).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ traceEndpoint: expect.any(String) }),
      expect.stringContaining("OpenTelemetry initialized"),
    );
  });
});
