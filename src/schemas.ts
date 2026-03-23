import { z } from "zod";

export const MAX_NAME_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 320;
export const MAX_POSITION_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_URL_LENGTH = 2048;

export const EmailSchema = z.string().email().max(MAX_EMAIL_LENGTH);

export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  position: z.string().max(MAX_POSITION_LENGTH).nullable(),
  email: z.string().email().max(MAX_EMAIL_LENGTH).nullable(),
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
  teamName: z.string().min(1).max(MAX_NAME_LENGTH),
  teamManagerId: z.string().uuid().nullable(),
  managerName: z.string().nullable(),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  members: z.array(TeamMemberSchema),
});

export type CombinedTeam = z.infer<typeof TeamSchema>;

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

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(["superuser", "administrator", "user", "guest"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedPermissions: z.record(z.string(), z.boolean()),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PermissionsSchema = z.record(z.string(), z.boolean());

export type Permissions = z.infer<typeof PermissionsSchema>;

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

export const DashboardTeamSizeSchema = z.object({
  teamName: z.string(),
  memberCount: z.number().int(),
});

export const DashboardDepartmentSizeSchema = z.object({
  departmentName: z.string(),
  teamCount: z.number().int(),
});

export const DashboardGrowthPointSchema = z.object({
  date: z.string(),
  persons: z.number().int(),
  teams: z.number().int(),
  departments: z.number().int(),
});

export const DashboardRecentActivitySchema = z.object({
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  userEmail: z.string().nullable(),
  createdAt: z.date(),
});

export const DashboardMetricsSchema = z.object({
  totalPersons: z.number().int(),
  totalTeams: z.number().int(),
  totalDepartments: z.number().int(),
  totalUsers: z.number().int(),
  teamSizes: z.array(DashboardTeamSizeSchema),
  departmentSizes: z.array(DashboardDepartmentSizeSchema),
  growthTimeline: z.array(DashboardGrowthPointSchema),
  recentActivity: z.array(DashboardRecentActivitySchema),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type DashboardTeamSize = z.infer<typeof DashboardTeamSizeSchema>;
export type DashboardDepartmentSize = z.infer<typeof DashboardDepartmentSizeSchema>;
export type DashboardGrowthPoint = z.infer<typeof DashboardGrowthPointSchema>;
export type DashboardRecentActivity = z.infer<typeof DashboardRecentActivitySchema>;

export const CsvPersonImportRowSchema = z.object({
  name: z.string().min(1, "Name is required").max(MAX_NAME_LENGTH),
  email: z.string().email("Invalid email format").max(MAX_EMAIL_LENGTH),
  position: z.string().max(MAX_POSITION_LENGTH).optional(),
});

export type CsvPersonImportRow = z.infer<typeof CsvPersonImportRowSchema>;

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_FILE_SIZE = 1024 * 1024; // 1 MB
