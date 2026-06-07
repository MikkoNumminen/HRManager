import { isDemoLoginEnabled } from "@/constants";

// Security gate for the zero-credential demo login provider. It must fail
// closed: enabled only when NEXT_PUBLIC_DEMO_LOGIN is exactly "true", so a
// deployment that forgets the flag never ships a one-click superuser login.
describe("isDemoLoginEnabled", () => {
  const original = process.env.NEXT_PUBLIC_DEMO_LOGIN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_DEMO_LOGIN;
    } else {
      process.env.NEXT_PUBLIC_DEMO_LOGIN = original;
    }
  });

  test("enabled only when explicitly 'true'", () => {
    process.env.NEXT_PUBLIC_DEMO_LOGIN = "true";
    expect(isDemoLoginEnabled()).toBe(true);
  });

  test("disabled by default when unset (fail closed)", () => {
    delete process.env.NEXT_PUBLIC_DEMO_LOGIN;
    expect(isDemoLoginEnabled()).toBe(false);
  });

  test("disabled for any non-'true' value", () => {
    for (const value of ["false", "", "1", "yes", "TRUE"]) {
      process.env.NEXT_PUBLIC_DEMO_LOGIN = value;
      expect(isDemoLoginEnabled()).toBe(false);
    }
  });
});
