import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas/shared";

export const DepartmentTeamSchema = z.object({
  teamId: z.string().uuid(),
  teamName: z.string(),
});

export const DepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  headId: z.string().uuid().nullable(),
  headName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  teams: z.array(DepartmentTeamSchema),
});

export type Department = z.infer<typeof DepartmentSchema>;
