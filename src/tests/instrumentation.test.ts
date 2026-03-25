// Tests for src/instrumentation.ts — verifies register() only initializes telemetry in Node.js runtime.

jest.mock("@/lib/telemetry", () => ({
  initTelemetry: jest.fn(),
}));

describe("instrumentation register()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Should call initTelemetry when running in Node.js runtime
  it("initializes telemetry in nodejs runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const { register } = await import("@/instrumentation");
    await register();

    const { initTelemetry } = await import("@/lib/telemetry");
    expect(initTelemetry).toHaveBeenCalledTimes(1);
  });

  // Should NOT call initTelemetry in edge runtime
  it("does not initialize telemetry in edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { register } = await import("@/instrumentation");
    await register();

    const { initTelemetry } = await import("@/lib/telemetry");
    expect(initTelemetry).not.toHaveBeenCalled();
  });

  // Should NOT call initTelemetry when runtime is undefined
  it("does not initialize telemetry when runtime is undefined", async () => {
    delete process.env.NEXT_RUNTIME;
    const { register } = await import("@/instrumentation");
    await register();

    const { initTelemetry } = await import("@/lib/telemetry");
    expect(initTelemetry).not.toHaveBeenCalled();
  });
});
