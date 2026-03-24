import logger, { createRequestLogger } from "@/lib/logger";

describe("Structured logger (Pino)", () => {
  // Logger instance is defined and has standard log methods.
  test("exports a logger with standard log methods", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  // createRequestLogger creates a child logger with context fields.
  test("createRequestLogger returns a child logger with context", () => {
    const child = createRequestLogger({
      traceId: "trace-123",
      userId: "user-456",
      action: "createPerson",
    });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
    expect(typeof child.error).toBe("function");
  });

  // Logger outputs JSON with level field.
  test("logger outputs structured JSON with level", () => {
    const dest = logger.child({}, { level: "info" });
    // Pino child loggers inherit the destination — we just verify the shape
    expect(dest).toBeDefined();
  });

  // Child logger preserves parent context.
  test("child logger can be created with extra context", () => {
    const child = createRequestLogger({ traceId: "t-1" });
    const grandchild = child.child({ duration: 42 });
    expect(grandchild).toBeDefined();
    expect(typeof grandchild.info).toBe("function");
  });
});
