import { ActionError, type ErrorCode } from "@/actionErrors";

describe("ActionError", () => {
  // ActionError extends Error, so instanceof checks work correctly.
  test("is an instance of Error", () => {
    const err = new ActionError("personNotFound", "Person not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ActionError);
  });

  // The name property is set to "ActionError" for easy identification in stack traces.
  test("has name ActionError", () => {
    const err = new ActionError("personNotFound", "Person not found");
    expect(err.name).toBe("ActionError");
  });

  // The code property matches the ErrorCode passed to the constructor.
  test("stores the error code", () => {
    const err = new ActionError("permissionDenied", "Permission denied: person:create");
    expect(err.code).toBe("permissionDenied");
  });

  // The message property matches the translated string passed to the constructor.
  test("stores the message", () => {
    const err = new ActionError("emailAlreadyExists", "Email already exists");
    expect(err.message).toBe("Email already exists");
  });

  // All ErrorCode values should be valid string literals — spot-check a few.
  test("accepts all expected error codes without TypeScript error", () => {
    const codes: ErrorCode[] = [
      "invalidName",
      "emailRequired",
      "personNotFound",
      "teamNotFound",
      "departmentNotFound",
      "permissionDenied",
      "rateLimited",
      "unexpectedError",
      "leaveTypeNotFound",
      "reviewCycleNotFound",
    ];
    for (const code of codes) {
      const err = new ActionError(code, "test");
      expect(err.code).toBe(code);
    }
  });
});
