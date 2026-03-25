/**
 * Storybook mock for next-intl.
 * Returns the translation key as-is so components render legibly
 * without requiring a real IntlProvider in Storybook stories.
 * The real next-intl is used in all Jest tests and the Next.js app.
 */

type TranslationFn = (key: string, values?: Record<string, unknown>) => string;

export function useTranslations(_namespace?: string): TranslationFn {
  return (key: string) => key;
}

export function useLocale(): string {
  return "en";
}

export function useFormatter() {
  return {
    dateTime: (value: Date) => value.toLocaleString(),
    number: (value: number) => String(value),
    relativeTime: (value: number) => String(value),
  };
}

export function NextIntlClientProvider({
  children,
}: {
  children: React.ReactNode;
  locale?: string;
  messages?: Record<string, unknown>;
}) {
  return <>{children}</>;
}
