/**
 * Barrel re-export — all server actions are available from "@/serverActions"
 * so existing imports across 68+ files continue working unchanged.
 *
 * All domain modules now live in src/features/<domain>/actions.ts
 */

export type { ActionResult } from "./_shared";
export {
  createPerson,
  removePerson,
  updatePersonName,
  updatePosition,
  updateEmail,
  addManager,
} from "../features/persons/actions";
export {
  addMember,
  createTeam,
  updateTeamName,
  removeTeam,
  removeMember,
} from "../features/teams/actions";
export {
  createDepartment,
  removeDepartment,
  updateDepartment,
  updateDepartmentHead,
  assignTeamToDepartment,
  removeTeamFromDepartment,
} from "../features/departments/actions";
export {
  resetAll,
  seedMockData,
  initializePermissions,
  updateUserRole,
  updateUserPermission,
  kickOutUser,
} from "../features/admin/actions";
export { updateProfileName, updateProfileImage } from "../features/profile/actions";
export {
  type ImportResult,
  importPersonsCsv,
  exportPersonsCsv,
  exportTeamsCsv,
  exportDepartmentsCsv,
  exportAuditLogsCsv,
} from "../features/data/actions";
export {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createLeaveRequest,
  reviewLeaveRequest,
  deleteLeaveRequest,
  allocateLeaveBalance,
} from "../features/leave/actions";
export {
  createReviewTemplate,
  deleteReviewTemplate,
  addReviewQuestion,
  removeReviewQuestion,
  createReviewCycle,
  deleteReviewCycle,
  openReviewCycle,
  closeReviewCycle,
  addReviewRequest,
  removeReviewRequest,
  submitReview,
} from "../features/reviews/actions";
export { createPositionEntry, deletePositionEntry } from "../features/positions/actions";
export {
  signOutOtherSessions,
  adminForceLogoutSession,
  adminForceLogoutAllSessions,
} from "../features/sessions/actions";
