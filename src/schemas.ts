import { z } from "zod";

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  position: z.string(),
  email: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Person = z.infer<typeof PersonSchema>;

export const TeamMemberSchema = z.object({
  personId: z.string(),
  name: z.string(),
  email: z.string(),
});

export const TeamSchema = z.object({
  teamId: z.string(),
  teamName: z.string().min(1),
  teamManagerId: z.string().nullable(),
  managerName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z.array(TeamMemberSchema),
});

export type CombinedTeam = z.infer<typeof TeamSchema>;
