// Tests for captureServerActionError — verifies Sentry.captureException is called
// correctly with and without extra context, using a mock of @sentry/nextjs.

import { captureServerActionError } from "@/lib/sentryCapture";

const mockCaptureException = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe("captureServerActionError", () => {
  beforeEach(() => {
    mockCaptureException.mockClear();
  });

  it("calls Sentry.captureException with the error", () => {
    // Arrange
    const error = new Error("server action failed");

    // Act
    captureServerActionError(error);

    // Assert
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: undefined });
  });

  it("passes extra context to Sentry.captureException", () => {
    // Arrange
    const error = new Error("validation error");
    const context = { action: "createEmployee", userId: "42" };

    // Act
    captureServerActionError(error, context);

    // Assert
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: context });
  });

  it("works with non-Error objects as the error argument", () => {
    // Arrange — sometimes server actions throw strings or unknown values
    const error = "something went wrong";

    // Act
    captureServerActionError(error);

    // Assert
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: undefined });
  });

  it("works with null context (no extra provided)", () => {
    // Arrange
    const error = new Error("null context case");

    // Act
    captureServerActionError(error, undefined);

    // Assert
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: undefined });
  });
});
