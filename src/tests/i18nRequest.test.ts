// Mock getRequestConfig to just pass through the callback function
jest.mock("next-intl/server", () => ({
  getRequestConfig: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockCookieGet = jest.fn();
const mockHeaderGet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => Promise.resolve({ get: mockCookieGet })),
  headers: jest.fn(() => Promise.resolve({ get: mockHeaderGet })),
}));

// The default export is now the raw async config function (since getRequestConfig is pass-through)
import configFn from "../i18n/request";

const getConfig = configFn as unknown as () => Promise<{ locale: string; messages: unknown }>;

describe("i18n/request", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Uses the locale from the cookie when it's a valid locale
  test("uses locale from cookie when valid", async () => {
    mockCookieGet.mockReturnValue({ value: "de" });
    const result = await getConfig();
    expect(result.locale).toBe("de");
    expect(result.messages).toBeDefined();
  });

  // Falls back to Accept-Language header when cookie has no locale
  test("falls back to Accept-Language when no cookie", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("fr,en;q=0.9");
    const result = await getConfig();
    expect(result.locale).toBe("fr");
  });

  // Falls back to default locale when cookie is invalid
  test("falls back to header when cookie value is invalid", async () => {
    mockCookieGet.mockReturnValue({ value: "xx-invalid" });
    mockHeaderGet.mockReturnValue("es");
    const result = await getConfig();
    expect(result.locale).toBe("es");
  });

  // Respects quality values in Accept-Language and picks highest priority
  test("respects Accept-Language quality values", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("en;q=0.5,ja;q=0.9,de;q=0.7");
    const result = await getConfig();
    expect(result.locale).toBe("ja");
  });

  // Matches a language prefix when exact match is not available
  test("matches language prefix from Accept-Language", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("de-AT,en;q=0.8");
    const result = await getConfig();
    expect(result.locale).toBe("de");
  });

  // Falls back to default locale when no Accept-Language matches
  test("falls back to default locale when no header matches", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("xx-YY,zz;q=0.5");
    const result = await getConfig();
    expect(result.locale).toBe("fi");
  });

  // Falls back to default locale when Accept-Language header is null
  test("falls back to default locale when Accept-Language is null", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue(null);
    const result = await getConfig();
    expect(result.locale).toBe("fi");
  });

  // Returns messages object for the detected locale
  test("returns messages for the detected locale", async () => {
    mockCookieGet.mockReturnValue({ value: "en" });
    const result = await getConfig();
    expect(result.locale).toBe("en");
    expect(result.messages).toBeDefined();
    expect(typeof result.messages).toBe("object");
  });

  // Handles Accept-Language with multiple matching locales — picks first by quality
  test("picks first matching locale by quality order", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("ko;q=1,ja;q=0.9");
    const result = await getConfig();
    expect(result.locale).toBe("ko");
  });

  // Handles Accept-Language with no quality (defaults to q=1)
  test("treats missing quality as q=1", async () => {
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("pl");
    const result = await getConfig();
    expect(result.locale).toBe("pl");
  });
});
