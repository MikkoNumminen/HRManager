/**
 * Barrel re-export of all schemas.
 *
 * Feature-specific schemas live in src/features/[domain]/schemas.ts.
 * Shared constants and validators live in src/schemas/shared.ts.
 *
 * This file re-exports everything so existing `import { ... } from "@/schemas"`
 * imports continue to work without changes.
 */

// Shared constants & validators
export {
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
  EmailSchema,
  ImageUrlSchema,
} from "./shared";

// Feature schemas
export { PersonSchema, type Person } from "@/features/persons/schemas";
export { TeamMemberSchema, TeamSchema, type CombinedTeam } from "@/features/teams/schemas";
export {
  DepartmentTeamSchema,
  DepartmentSchema,
  type Department,
} from "@/features/departments/schemas";
export {
  UserSchema,
  type AppUser,
  PermissionsSchema,
  type Permissions,
} from "@/features/admin/schemas";
export { UserProfileSchema, type UserProfile } from "@/features/profile/schemas";
export {
  TwoFactorSetupSchema,
  type TwoFactorSetup,
  TwoFactorVerifySchema,
  type TwoFactorVerify,
} from "@/features/twoFactor/schemas";
export {
  AuditActionSchema,
  AuditEntityTypeSchema,
  AuditLogSchema,
  type AuditLog,
  AuditLogFilterSchema,
  type AuditLogFilter,
} from "@/features/audit/schemas";
export {
  DashboardTeamSizeSchema,
  DashboardDepartmentSizeSchema,
  DashboardGrowthPointSchema,
  DashboardRecentActivitySchema,
  DashboardMetricsSchema,
  type DashboardMetrics,
  type DashboardTeamSize,
  type DashboardDepartmentSize,
  type DashboardGrowthPoint,
  type DashboardRecentActivity,
} from "@/features/dashboard/schemas";
export {
  CsvPersonImportRowSchema,
  type CsvPersonImportRow,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_FILE_SIZE,
  MAX_EXPORT_ROWS,
} from "@/features/data/schemas";
export {
  MAX_QUESTION_TEXT_LENGTH,
  ReviewQuestionSchema,
  type ReviewQuestion,
  ReviewTemplateSchema,
  type ReviewTemplate,
  ReviewCycleSchema,
  type ReviewCycle,
  ReviewRequestSchema,
  type ReviewRequest,
  ReviewAnswerSchema,
  type ReviewAnswer,
  ReviewSubmissionSchema,
  type ReviewSubmission,
  TeamReviewRequestSchema,
  type TeamReviewRequest,
  TeamReviewReportSchema,
  type TeamReviewReport,
  TeamReviewCycleSchema,
  type TeamReviewCycle,
} from "@/features/reviews/schemas";
export {
  MAX_LEAVE_NOTE_LENGTH,
  LeaveRequestStatusSchema,
  LeaveTypeSchema,
  type LeaveType,
  LeaveRequestSchema,
  type LeaveRequest,
  LeaveBalanceSchema,
  type LeaveBalance,
} from "@/features/leave/schemas";
export { PositionSchema, type Position } from "@/features/positions/schemas";
export {
  EmployeeTeamSchema,
  EmployeeDepartmentSchema,
  EmployeeProfileSchema,
  type EmployeeProfile,
} from "@/features/employee/schemas";
export {
  OrgChartMemberSchema,
  type OrgChartMember,
  OrgChartTeamSchema,
  type OrgChartTeam,
  OrgChartDepartmentSchema,
  type OrgChartDepartment,
  OrgChartDataSchema,
  type OrgChartData,
} from "@/features/reports/schemas";
export {
  MAX_CONCURRENT_SESSIONS,
  UserSessionSchema,
  type UserSession,
} from "@/features/sessions/schemas";
export { RealtimeEventSchema, type RealtimeEvent } from "@/features/realtime/schemas";
