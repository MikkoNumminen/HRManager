import { z } from "zod";

export const FeatureFlagScopeSchema = z.enum(["GLOBAL", "USER"]);
export type FeatureFlagScope = z.infer<typeof FeatureFlagScopeSchema>;

export const FeatureFlagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  scope: FeatureFlagScopeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  userOverrideCount: z.number().int().optional(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

/** Name must be lowercase alphanumeric with hyphens only */
const FLAG_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const CreateFeatureFlagSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(FLAG_NAME_REGEX, "Flag name must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  scope: FeatureFlagScopeSchema.default("GLOBAL"),
});

export type CreateFeatureFlag = z.infer<typeof CreateFeatureFlagSchema>;

export const UserFeatureFlagSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string().nullable(),
  userEmail: z.string(),
  flagId: z.string().uuid(),
  flagName: z.string(),
  enabled: z.boolean(),
});

export type UserFeatureFlag = z.infer<typeof UserFeatureFlagSchema>;
