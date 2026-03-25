/**
 * Typed error codes for server actions.
 * Each code maps 1:1 to a key in the `errors` i18n namespace,
 * plus the system-level codes `permissionDenied` and `rateLimited`.
 */
export type ErrorCode =
  // Name / text validation
  | "invalidName"
  | "nameTooLong"
  | "nameRequired"
  | "newNameRequired"
  // Email validation
  | "emailRequired"
  | "newEmailRequired"
  | "emailTooLong"
  | "invalidEmailFormat"
  | "emailAlreadyExists"
  // Position
  | "positionRequired"
  | "positionTooLong"
  // Description / URL / note
  | "descriptionTooLong"
  | "urlTooLong"
  | "invalidUrlFormat"
  | "invalidUrlProtocol"
  | "imageUrlDomainNotAllowed"
  | "noteTooLong"
  // Person
  | "noPersonSelected"
  | "noPersonProvided"
  | "personNotFound"
  // Team
  | "noTeamSelected"
  | "noTeamProvided"
  | "teamNotFound"
  | "teamNameRequired"
  | "alreadyMember"
  | "notMember"
  // Department
  | "noDepartmentSelected"
  | "noDepartmentProvided"
  | "departmentNotFound"
  | "departmentNameRequired"
  // User / admin
  | "noUserProvided"
  | "noRoleProvided"
  | "invalidRole"
  | "userNotFound"
  | "cannotChangeSuperuserRole"
  | "noPermissionProvided"
  | "noActionProvided"
  | "cannotModifySuperuserPermissions"
  | "permissionNotFound"
  | "cannotKickSuperuser"
  | "demoCannotManageUsers"
  | "cannotKickYourself"
  | "notAuthenticated"
  // CSV import
  | "csvNoFile"
  | "csvNotCsvFile"
  | "csvFileTooLarge"
  | "csvEmpty"
  | "csvTooManyRows"
  // Position catalog
  | "positionAlreadyExists"
  | "positionNotFound"
  // Leave management
  | "leaveTypeAlreadyExists"
  | "leaveTypeNotFound"
  | "leaveTypeRequired"
  | "leaveRequestNotFound"
  | "leaveRequestOverlapping"
  | "insufficientLeaveBalance"
  | "invalidDateRange"
  | "endDateBeforeStartDate"
  | "invalidDaysValue"
  | "invalidLeaveAction"
  | "cannotDeleteNonPendingRequest"
  | "invalidYear"
  // Performance reviews
  | "reviewTemplateNotFound"
  | "reviewCycleNotFound"
  | "reviewRequestNotFound"
  | "reviewCycleNotDraft"
  | "reviewCycleNotOpen"
  | "reviewCycleAlreadyClosed"
  | "reviewAlreadySubmitted"
  | "reviewAlreadyExists"
  | "invalidQuestionType"
  | "ratingOutOfRange"
  | "answerRequired"
  // Session management
  | "sessionNotFound"
  | "sessionAlreadyInactive"
  | "cannotDeactivateOwnSession"
  // Feature flags
  | "featureFlagNotFound"
  | "featureFlagAlreadyExists"
  // Two-factor authentication
  | "invalidTotpCode"
  | "invalidTotpSecret"
  | "twoFactorAlreadyEnabled"
  | "twoFactorNotEnabled"
  // Generic
  | "invalidId"
  // IP allowlist
  | "ipNotAllowed"
  // System-level (not in errors namespace — detected/attached by safe())
  | "permissionDenied"
  | "rateLimited"
  | "unexpectedError";

/**
 * Typed error thrown inside server actions. Carries an `ErrorCode` alongside
 * the translated message so callers can react programmatically to specific
 * error types without parsing localised strings.
 */
export class ActionError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ActionError";
  }
}
