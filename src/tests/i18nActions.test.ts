const mockCookieSet = jest.fn();

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => Promise.resolve({ set: mockCookieSet })),
}));

import { setLocale } from "../i18n/actions";

describe("i18n/actions - setLocale", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Sets the locale cookie when given a valid locale
  test("sets locale cookie for valid locale", async () => {
    await setLocale("de");
    expect(mockCookieSet).toHaveBeenCalledWith("locale", "de", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  });

  // Does nothing when given an invalid locale
  test("does nothing for invalid locale", async () => {
    await setLocale("xx-invalid");
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  // Works with all supported locales
  test("works with all supported locales", async () => {
    const validLocales = ["en", "fi", "sv", "de", "fr", "es", "pt", "pl", "ru", "uk", "ar", "hi", "ja", "zh", "ko", "th", "sw", "tr"];
    for (const locale of validLocales) {
      mockCookieSet.mockClear();
      await setLocale(locale);
      expect(mockCookieSet).toHaveBeenCalledWith("locale", locale, expect.any(Object));
    }
  });

  // Does nothing for empty string
  test("does nothing for empty string", async () => {
    await setLocale("");
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
