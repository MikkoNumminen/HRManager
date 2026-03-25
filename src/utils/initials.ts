/**
 * Extract up to 2 initials from a name string.
 * "John Doe" -> "JD", "Alice" -> "A", null/empty -> "?"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
