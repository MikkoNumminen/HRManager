import { z } from "zod";
import { MAX_NAME_LENGTH } from "@/schemas/shared";

export const PositionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Position = z.infer<typeof PositionSchema>;
