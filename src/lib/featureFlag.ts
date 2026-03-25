import { prisma } from "@/db";

/**
 * Resolution order:
 * 1. Environment variable: FEATURE_FLAG_<NAME_UPPERCASE>=true|false
 * 2. User-specific override (if userId provided and flag scope is USER)
 * 3. Global flag value from DB
 * 4. Default: false
 */
export async function isFeatureEnabled(flagName: string, userId?: string | null): Promise<boolean> {
  // 1. Check environment variable override
  const envKey = `FEATURE_FLAG_${flagName.toUpperCase().replace(/-/g, "_")}`;
  const envValue = process.env[envKey];
  if (envValue === "true") return true;
  if (envValue === "false") return false;

  // 2–3. Look up flag in database
  const flag = await prisma.featureFlag.findUnique({
    where: { name: flagName },
    include: {
      userFlags: userId && userId.length > 0 ? { where: { userId }, take: 1 } : false,
    },
  });

  // Unknown flag → false
  if (!flag) return false;

  // For USER-scoped flags, check user override first
  if (flag.scope === "USER" && userId) {
    const userFlags = flag.userFlags as { enabled: boolean }[] | undefined;
    if (userFlags && userFlags.length > 0) {
      return userFlags[0].enabled;
    }
  }

  // 3. Global flag value
  return flag.enabled;
}

/**
 * Batch check for multiple flags — single DB query.
 */
export async function getEnabledFlags(
  flagNames: string[],
  userId?: string | null,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};

  // Start with env var overrides and collect remaining flags to query
  const toQuery: string[] = [];
  for (const name of flagNames) {
    const envKey = `FEATURE_FLAG_${name.toUpperCase().replace(/-/g, "_")}`;
    const envValue = process.env[envKey];
    if (envValue === "true") {
      result[name] = true;
    } else if (envValue === "false") {
      result[name] = false;
    } else {
      toQuery.push(name);
    }
  }

  if (toQuery.length === 0) return result;

  // Single DB query for all remaining flags
  const flags = await prisma.featureFlag.findMany({
    where: { name: { in: toQuery } },
    include: {
      userFlags: userId && userId.length > 0 ? { where: { userId } } : false,
    },
  });

  const flagMap = new Map(flags.map((f) => [f.name, f]));

  for (const name of toQuery) {
    const flag = flagMap.get(name);
    if (!flag) {
      result[name] = false;
      continue;
    }

    // For USER-scoped flags, check user override first
    if (flag.scope === "USER" && userId) {
      const userFlags = flag.userFlags as { enabled: boolean }[] | undefined;
      if (userFlags && userFlags.length > 0) {
        result[name] = userFlags[0].enabled;
        continue;
      }
    }

    result[name] = flag.enabled;
  }

  return result;
}
