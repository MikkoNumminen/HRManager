import { z } from "zod";

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(["superuser", "administrator", "user", "guest"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedPermissions: z.record(z.string(), z.boolean()),
  twoFactorEnabled: z.boolean().default(false),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
