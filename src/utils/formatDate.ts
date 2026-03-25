/**
 * Safely formats a date value to a locale string.
 * Returns an em dash for null/undefined/invalid dates.
 */
export function formatDate(
  value: Date | string | number | null | undefined,
  locale = "en",
): string {
  if (!value) return "\u2014";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "\u2014";
    return d.toLocaleString(locale);
  } catch {
    return "\u2014";
  }
}
