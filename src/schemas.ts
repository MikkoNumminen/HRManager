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

export const AuditActionSchema = z.enum(["create", "update", "delete", "seed", "reset"]);

export const AuditEntityTypeSchema = z.enum([
  "person",
  "team",
  "teamMember",
  "user",
  "userPermission",
]);

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
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
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;
