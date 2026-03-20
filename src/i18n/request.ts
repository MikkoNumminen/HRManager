import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, Locale } from "./config";

function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    const exact = locales.find((l) => l === lang);
    if (exact) return exact;

    const prefix = lang.split("-")[0];
    const match = locales.find((l) => l === prefix);
    if (match) return match;
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("locale")?.value;

  let locale: Locale;
  if (raw && locales.includes(raw as Locale)) {
    locale = raw as Locale;
  } else {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language");
    locale = detectLocaleFromHeader(acceptLanguage);
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});
