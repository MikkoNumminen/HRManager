import { prisma } from "@/db";
import { requirePermission } from "@/permissions";
import type { FeatureFlag, UserFeatureFlag } from "./schemas";

/** List all feature flags with user override counts, sorted by name. */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  await requirePermission("admin:manage_feature_flags");

  const flags = await prisma.featureFlag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { userFlags: true } },
    },
  });

  return flags.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    enabled: f.enabled,
    scope: f.scope,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    userOverrideCount: f._count.userFlags,
  }));
}

/** Get a single feature flag by ID. */
export async function getFeatureFlagById(id: string): Promise<FeatureFlag | null> {
  await requirePermission("admin:manage_feature_flags");

  const flag = await prisma.featureFlag.findUnique({
    where: { id },
    include: {
      _count: { select: { userFlags: true } },
    },
  });

  if (!flag) return null;

  return {
    id: flag.id,
    name: flag.name,
    description: flag.description,
    enabled: flag.enabled,
    scope: flag.scope,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt,
    userOverrideCount: flag._count.userFlags,
  };
}

/** Get user-level overrides for a specific flag, joined with user data. */
export async function getUserFeatureFlags(flagId: string): Promise<UserFeatureFlag[]> {
  await requirePermission("admin:manage_feature_flags");

  const overrides = await prisma.userFeatureFlag.findMany({
    where: { flagId },
    include: {
      user: { select: { name: true, email: true } },
      flag: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return overrides.map((o) => ({
    id: o.id,
    userId: o.userId,
    userName: o.user.name,
    userEmail: o.user.email,
    flagId: o.flagId,
    flagName: o.flag.name,
    enabled: o.enabled,
  }));
}
