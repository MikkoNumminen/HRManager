import { z } from "zod";

export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  position: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Person = z.infer<typeof PersonSchema>;

export const TeamMemberSchema = z.object({
  personId: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
});

export const TeamSchema = z.object({
  teamId: z.string().uuid(),
  teamName: z.string().min(1),
  teamManagerId: z.string().uuid().nullable(),
  managerName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z.array(TeamMemberSchema),
});

export type CombinedTeam = z.infer<typeof TeamSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(["superuser", "administrator", "user", "guest"]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type AppUser = z.infer<typeof UserSchema>;

export const PermissionsSchema = z.record(z.string(), z.boolean());

export type Permissions = z.infer<typeof PermissionsSchema>;
