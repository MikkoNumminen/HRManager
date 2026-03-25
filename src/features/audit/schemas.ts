import { z } from "zod";

export const AuditActionSchema = z.enum([
  "create",
  "update",
  "delete",
  "kickout",
  "seed",
  "reset",
  "permission_denied",
  "rate_limited",
  "import",
  "export",
  "approve",
  "reject",
  "ip_blocked",
  "session_login",
  "session_force_logout",
  "session_concurrent_exceeded",
]);

export const AuditEntityTypeSchema = z.enum([
  "person",
  "team",
  "teamMember",
  "department",
  "user",
  "userPermission",
  "auth",
  "security",
  "reviewTemplate",
  "reviewCycle",
  "reviewRequest",
  "reviewSubmission",
  "leaveType",
  "leaveRequest",
  "leaveBalance",
  "position",
  "userSession",
  "featureFlag",
  "job",
]);

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  entityId: z.string().nullable(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  createdAt: z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogFilterSchema = z.object({
  userEmail: z.string().optional(),
  action: AuditActionSchema.optional(),
  entityType: AuditEntityTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;
