import { z } from "zod";

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string().nullable(),
  email: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TeamSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  teamManagerId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
    })
  ),
});
