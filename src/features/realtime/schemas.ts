import { z } from "zod";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/features/audit/schemas";

export const RealtimeEventSchema = z.object({
  id: z.string(),
  type: z.enum(["mutation", "notification"]),
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  entityId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  summary: z.string(),
  sessionId: z.string().nullable(),
  timestamp: z.number(),
});

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
