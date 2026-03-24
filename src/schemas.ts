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
  "approve",
  "reject",
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

export const MAX_QUESTION_TEXT_LENGTH = 500;

export const ReviewQuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(MAX_QUESTION_TEXT_LENGTH),
  type: z.enum(["RATING", "TEXT"]),
  scaleMin: z.number().int().min(1).max(5).nullable(),
  scaleMax: z.number().int().min(2).max(10).nullable(),
  order: z.number().int().min(0),
  required: z.boolean(),
});

export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;

export const ReviewTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  questions: z.array(ReviewQuestionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReviewTemplate = z.infer<typeof ReviewTemplateSchema>;

export const ReviewCycleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  templateId: z.string().uuid().nullable(),
  templateName: z.string().nullable(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  startDate: z.date(),
  endDate: z.date(),
  requestCount: z.number().int(),
  submittedCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReviewCycle = z.infer<typeof ReviewCycleSchema>;

export const ReviewRequestSchema = z.object({
  id: z.string().uuid(),
  cycleId: z.string().uuid(),
  cycleName: z.string(),
  cycleStatus: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  subjectId: z.string().uuid().nullable(),
  subjectName: z.string().nullable(),
  reviewerId: z.string().uuid().nullable(),
  reviewerName: z.string().nullable(),
  type: z.enum(["SELF", "MANAGER", "PEER", "DIRECT_REPORT"]),
  status: z.enum(["PENDING", "SUBMITTED"]),
  createdAt: z.date(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const ReviewAnswerSchema = z.object({
  questionId: z.string().uuid(),
  ratingValue: z.number().int().min(1).max(10).nullable(),
  textValue: z.string().max(2000).nullable(),
});

export type ReviewAnswer = z.infer<typeof ReviewAnswerSchema>;

export const ReviewSubmissionSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  answers: z.array(ReviewAnswerSchema),
  submittedAt: z.date(),
});

export type ReviewSubmission = z.infer<typeof ReviewSubmissionSchema>;

export const MAX_LEAVE_NOTE_LENGTH = 500;

export const LeaveRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const LeaveTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  defaultDays: z.number().int().min(0),
  color: z.string().max(7),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export const LeaveRequestSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  personName: z.string(),
  leaveTypeId: z.string().uuid(),
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  days: z.number().int().min(1),
  note: z.string().max(MAX_LEAVE_NOTE_LENGTH).nullable(),
  status: LeaveRequestStatusSchema,
  reviewerId: z.string().uuid().nullable(),
  reviewerName: z.string().nullable(),
  reviewNote: z.string().max(MAX_LEAVE_NOTE_LENGTH).nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const LeaveBalanceSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  personName: z.string(),
  leaveTypeId: z.string().uuid(),
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  year: z.number().int(),
  allocated: z.number().int().min(0),
  used: z.number().int().min(0),
  remaining: z.number().int(),
});

export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;
