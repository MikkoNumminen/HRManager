/**
 * Barrel re-export — all query functions are available from "@/queries"
 * so existing imports across 28+ pages and components continue working unchanged.
 *
 * All domain modules now live in src/features/<domain>/queries.ts
 */

export { PAGE_SIZE } from "@/constants";
export { getPositions } from "./features/positions/queries";
export { getProfile } from "./features/profile/queries";
export { getAuditLogs, getAuditLogUserEmails } from "./features/audit/queries";
export { getDashboardMetrics, getOrgChartData } from "./features/dashboard/queries";
export {
  getPersons,
  getPagedPersons,
  getEmployeeProfile,
  getPersonDeleteImpact,
} from "./features/persons/queries";
export { getTeams, getPagedTeams, getTeamDeleteImpact } from "./features/teams/queries";
export {
  getDepartments,
  getPagedDepartments,
  getDepartmentDeleteImpact,
} from "./features/departments/queries";
export { getLeaveTypes, getLeaveRequests, getLeaveBalances } from "./features/leave/queries";
export {
  getUsers,
  getUserById,
  getAllPermissionKeys,
  getDataExportCounts,
  type DataExportCounts,
} from "./features/admin/queries";
export {
  getReviewTemplates,
  getReviewTemplate,
  getReviewCycles,
  getReviewCycle,
  getMyReviewRequests,
  getReviewRequestWithTemplate,
  getManagerTeamReviews,
} from "./features/reviews/queries";
export { getMyActiveSessions, getUserActiveSessions } from "./features/sessions/queries";
export {
  getTwoFactorStatus,
  isUserTwoFactorEnabled,
  getUserTwoFactorAuth,
} from "./features/twoFactor/queries";
