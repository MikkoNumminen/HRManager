import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_POSITION_LENGTH, MAX_EMAIL_LENGTH } from "@/schemas/shared";

export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  position: z.string().max(MAX_POSITION_LENGTH).nullable(),
  email: z.string().email().max(MAX_EMAIL_LENGTH).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Person = z.infer<typeof PersonSchema>;
