/**
 * Barrel re-export — all server actions are available from "@/serverActions"
 * so existing imports across 68+ files continue working unchanged.
 *
 * Domain modules:
 *   person.ts, team.ts, department.ts, admin.ts, profile.ts,
 *   data.ts, leave.ts, reviews.ts, positions.ts
 */

export type { ActionResult } from "./_shared";
export {
  createPerson,
  removePerson,
  updatePersonName,
  updatePosition,
  updateEmail,
  addManager,
} from "./person";
export { addMember, createTeam, updateTeamName, removeTeam, removeMember } from "./team";
export {
  createDepartment,
  removeDepartment,
  updateDepartment,
  updateDepartmentHead,
  assignTeamToDepartment,
  removeTeamFromDepartment,
} from "./department";
export {
  resetAll,
  seedMockData,
  initializePermissions,
  updateUserRole,
  updateUserPermission,
  kickOutUser,
} from "./admin";
export { updateProfileName, updateProfileImage } from "./profile";
export {
  type ImportResult,
  importPersonsCsv,
  exportPersonsCsv,
  exportTeamsCsv,
  exportDepartmentsCsv,
  exportAuditLogsCsv,
} from "./data";
export {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createLeaveRequest,
  reviewLeaveRequest,
  deleteLeaveRequest,
  allocateLeaveBalance,
} from "./leave";
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
} from "./reviews";
export { createPositionEntry, deletePositionEntry } from "../features/positions/actions";
