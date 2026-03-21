export const locales = [
  "en",
  "fi",
  "sv",
  "de",
  "fr",
  "es",
  "pt",
  "pl",
  "ru",
  "uk",
  "ar",
  "hi",
  "ja",
  "zh",
  "ko",
  "th",
  "sw",
  "tr",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fi";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fi: "Suomi",
  sv: "Svenska",
  de: "Deutsch",
  fr: "Fran\u00e7ais",
  es: "Espa\u00f1ol",
  pt: "Portugu\u00eas",
  pl: "Polski",
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  uk: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
  hi: "\u0939\u093f\u0928\u094d\u0926\u0940",
  ja: "\u65e5\u672c\u8a9e",
  zh: "\u4e2d\u6587",
  ko: "\ud55c\uad6d\uc5b4",
  th: "\u0e44\u0e17\u0e22",
  sw: "Kiswahili",
  tr: "T\u00fcrk\u00e7e",
};
