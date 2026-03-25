import { z } from "zod";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/features/audit/schemas";

/** Data payload for cleanup queue jobs. */
export const CleanupJobDataSchema = z.object({
  type: z.enum(["rate-limits", "demo-sessions", "all"]),
});

export type CleanupJobData = z.infer<typeof CleanupJobDataSchema>;

/** Data payload for audit-export queue jobs. */
export const AuditExportJobDataSchema = z.object({
  userId: z.string(),
  filters: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    action: AuditActionSchema.optional(),
    entityType: AuditEntityTypeSchema.optional(),
  }),
  format: z.enum(["csv", "json"]),
});

export type AuditExportJobData = z.infer<typeof AuditExportJobDataSchema>;

/** Aggregated status counts for a single queue. */
export interface JobStatusResponse {
  queueName: string;
  counts: {
    created: number;
    active: number;
    completed: number;
    failed: number;
    expired: number;
  };
}

/** Serializable job record returned by queries. */
export interface JobRecord {
  id: string;
  name: string;
  state: string;
  data: unknown;
  output: unknown;
  createdOn: string;
  startedOn: string | null;
  completedOn: string | null;
  retryCount: number;
}
