import { unstable_cache as nextCache } from "next/cache";

// Reusable wrapper around next/cache.unstable_cache.
//
// In test environments, unstable_cache requires the Next.js incremental cache runtime,
// which isn't available under Jest. Fall back to a passthrough so feature/server tests
// can call cached functions directly without mocking next/cache.
//
// In all other environments, defers to nextCache with the supplied keyParts/options.
//
// Usage:
//   const fetchFooCached = cache(
//     async (sessionId: string | null) => fetchFooUncached(sessionId),
//     ["foo"],
//     { revalidate: 300, tags: ["org-data"] },
//   );
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- must match Next.js Callback type
export function cache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { revalidate?: number; tags?: string[] },
): T {
  if (process.env.NODE_ENV === "test") return fn;
  return nextCache(fn, keyParts, options) as unknown as T;
}
