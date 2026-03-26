import { formatDate } from "@/utils/formatDate";

describe("formatDate", () => {
  // null input returns an em dash (—)
  test("returns em dash for null", () => {
    expect(formatDate(null)).toBe("\u2014");
  });

  // undefined input returns an em dash
  test("returns em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("\u2014");
  });

  // empty string is falsy, returns em dash
  test("returns em dash for empty string", () => {
    expect(formatDate("")).toBe("\u2014");
  });

  // 0 (number) is falsy, returns em dash
  test("returns em dash for 0", () => {
    expect(formatDate(0)).toBe("\u2014");
  });

  // a valid ISO date string is parsed and formatted
  test("formats a valid ISO date string", () => {
    const result = formatDate("2024-01-15T00:00:00.000Z", "en");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
  });

  // a valid Date object is formatted
  test("formats a valid Date object", () => {
    const date = new Date("2024-06-01T12:00:00.000Z");
    const result = formatDate(date, "en");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
  });

  // a valid timestamp number is formatted
  test("formats a valid timestamp number", () => {
    const ts = new Date("2024-03-15").getTime();
    const result = formatDate(ts, "en");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("\u2014");
  });

  // a string that cannot be parsed as a date returns em dash
  test("returns em dash for non-parseable date string", () => {
    expect(formatDate("not-a-date")).toBe("\u2014");
  });

  // NaN produced by invalid number string results in em dash
  test("returns em dash for 'NaN' string", () => {
    expect(formatDate("NaN")).toBe("\u2014");
  });

  // uses the provided locale when formatting
  test("uses the locale parameter when formatting", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    const enResult = formatDate(date, "en");
    const fiResult = formatDate(date, "fi");
    // Both should be non-empty strings (locale differences depend on runtime)
    expect(typeof enResult).toBe("string");
    expect(typeof fiResult).toBe("string");
    expect(enResult).not.toBe("\u2014");
    expect(fiResult).not.toBe("\u2014");
  });

  // defaults to 'en' locale when locale is not provided
  test("uses en locale by default", () => {
    const date = new Date("2024-01-15T00:00:00.000Z");
    const withDefault = formatDate(date);
    const withExplicit = formatDate(date, "en");
    expect(withDefault).toBe(withExplicit);
  });

  // a Date object that wraps an invalid value (NaN internally) returns em dash
  test("returns em dash for an invalid Date object", () => {
    const invalid = new Date("invalid");
    expect(formatDate(invalid)).toBe("\u2014");
  });

  // very old dates are still parseable
  test("formats dates far in the past", () => {
    const result = formatDate("1900-01-01T00:00:00.000Z", "en");
    expect(result).not.toBe("\u2014");
  });

  // very future dates are still parseable
  test("formats dates far in the future", () => {
    const result = formatDate("2099-12-31T23:59:59.000Z", "en");
    expect(result).not.toBe("\u2014");
  });

  // when toLocaleString throws (e.g. due to a bad locale on some runtimes), returns em dash
  test("returns em dash when toLocaleString throws", () => {
    const date = new Date("2024-01-15T12:00:00.000Z");
    // Spy on the specific instance's toLocaleString to throw
    const spy = jest.spyOn(Date.prototype, "toLocaleString").mockImplementationOnce(() => {
      throw new RangeError("Invalid locale");
    });
    expect(formatDate(date, "en")).toBe("\u2014");
    spy.mockRestore();
  });
});
