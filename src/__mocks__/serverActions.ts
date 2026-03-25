/**
 * Storybook stub for @/serverActions.
 *
 * All server actions are replaced with async no-ops so components that import
 * them (TwoFactorSetup, ActiveSessions, LeaveManager, etc.) render correctly
 * in Storybook without a live database or Next.js server runtime.
 *
 * This file is aliased via .storybook/main.ts → webpackFinal → resolve.alias.
 * It is NOT used in Jest tests (Jest has its own per-test mocking).
 */

export type ActionResult = { error: string } | undefined;
export type ImportResult = { imported: number; skipped: number; errors: string[] };
export type TwoFactorSetupResult = { uri: string; secret: string; recoveryCodes: string[] };

// ── Person actions ──────────────────────────────────────────
export const createPerson = async () => undefined;
export const removePerson = async () => undefined;
export const updatePersonName = async () => undefined;
export const updatePosition = async () => undefined;
export const updateEmail = async () => undefined;
export const addManager = async () => undefined;

// ── Team actions ────────────────────────────────────────────
export const addMember = async () => undefined;
export const createTeam = async () => undefined;
export const updateTeamName = async () => undefined;
export const removeTeam = async () => undefined;
export const removeMember = async () => undefined;

// ── Department actions ──────────────────────────────────────
export const createDepartment = async () => undefined;
export const removeDepartment = async () => undefined;
export const updateDepartment = async () => undefined;
export const updateDepartmentHead = async () => undefined;
export const assignTeamToDepartment = async () => undefined;
export const removeTeamFromDepartment = async () => undefined;

// ── Admin actions ───────────────────────────────────────────
export const resetAll = async () => undefined;
export const seedMockData = async () => undefined;
export const initializePermissions = async () => undefined;
export const updateUserRole = async () => undefined;
export const updateUserPermission = async () => undefined;
export const kickOutUser = async () => undefined;

// ── Profile actions ─────────────────────────────────────────
export const updateProfileName = async () => undefined;
export const updateProfileImage = async () => undefined;

// ── Data import/export ──────────────────────────────────────
export const importPersonsCsv = async (): Promise<ImportResult> => ({
  imported: 0,
  skipped: 0,
  errors: [],
});
export const exportPersonsCsv = async () => undefined;
export const exportTeamsCsv = async () => undefined;
export const exportDepartmentsCsv = async () => undefined;
export const exportAuditLogsCsv = async () => undefined;

// ── Leave actions ───────────────────────────────────────────
export const createLeaveType = async () => undefined;
export const updateLeaveType = async () => undefined;
export const deleteLeaveType = async () => undefined;
export const createLeaveRequest = async () => undefined;
export const reviewLeaveRequest = async () => undefined;
export const deleteLeaveRequest = async () => undefined;
export const allocateLeaveBalance = async () => undefined;

// ── Review actions ──────────────────────────────────────────
export const createReviewTemplate = async () => undefined;
export const deleteReviewTemplate = async () => undefined;
export const addReviewQuestion = async () => undefined;
export const removeReviewQuestion = async () => undefined;
export const createReviewCycle = async () => undefined;
export const deleteReviewCycle = async () => undefined;
export const openReviewCycle = async () => undefined;
export const closeReviewCycle = async () => undefined;
export const addReviewRequest = async () => undefined;
export const removeReviewRequest = async () => undefined;
export const submitReview = async () => undefined;

// ── Position actions ────────────────────────────────────────
export const createPositionEntry = async () => undefined;
export const deletePositionEntry = async () => undefined;

// ── Session actions ─────────────────────────────────────────
export const signOutOtherSessions = async () => undefined;
export const adminForceLogoutSession = async () => undefined;
export const adminForceLogoutAllSessions = async () => undefined;

// ── 2FA actions ─────────────────────────────────────────────
export const beginTwoFactorSetup = async (): Promise<TwoFactorSetupResult> => ({
  uri: "otpauth://totp/HRManager:demo%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=HRManager",
  secret: "JBSWY3DPEHPK3PXP",
  recoveryCodes: [
    "AAAA-BBBB",
    "CCCC-DDDD",
    "EEEE-FFFF",
    "GGGG-HHHH",
    "IIII-JJJJ",
    "KKKK-LLLL",
    "MMMM-NNNN",
    "OOOO-PPPP",
  ],
});
export const confirmTwoFactorSetup = async () => undefined;
export const disableTwoFactor = async () => undefined;
export const regenerateRecoveryCodes = async () => undefined;
export const verifyTwoFactorLogin = async () => undefined;
export const adminResetTwoFactor = async () => undefined;
