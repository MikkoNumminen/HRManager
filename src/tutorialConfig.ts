export type TutorialStepId =
  | "view_employees"
  | "add_person"
  | "create_team"
  | "add_member"
  | "create_department"
  | "assign_team_to_department"
  | "manage_permissions"
  | "view_audit_log";

export interface TutorialStep {
  id: TutorialStepId;
  route: string | RegExp;
  targetSelector: string;
  event?: string;
  autoCompleteOnRoute?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "view_employees",
    route: "/",
    targetSelector: "[data-tutorial='persons-section']",
    autoCompleteOnRoute: true,
  },
  {
    id: "add_person",
    route: "/managePersons",
    targetSelector: "[data-tutorial='add-person-form']",
    event: "tutorial:person_created",
  },
  {
    id: "create_team",
    route: "/manageTeams",
    targetSelector: "[data-tutorial='add-team-form']",
    event: "tutorial:team_created",
  },
  {
    id: "add_member",
    route: /^\/manageTeams\/.+/,
    targetSelector: "[data-tutorial='add-member-form']",
    event: "tutorial:member_added",
  },
  {
    id: "create_department",
    route: "/manageDepartments",
    targetSelector: "[data-tutorial='add-department-form']",
    event: "tutorial:department_created",
  },
  {
    id: "assign_team_to_department",
    route: /^\/manageDepartments\/.+/,
    targetSelector: "[data-tutorial='assign-team-form']",
    event: "tutorial:team_assigned",
  },
  {
    id: "manage_permissions",
    route: /^\/admin\/.+/,
    targetSelector: "[data-tutorial='permission-editor']",
    event: "tutorial:permission_updated",
  },
  {
    id: "view_audit_log",
    route: "/admin/audit",
    targetSelector: "[data-tutorial='audit-log']",
    autoCompleteOnRoute: true,
  },
];

export const DEMO_EMAIL = "demo@hrmanager.app";
export const STORAGE_KEY = "hrm_tutorial_progress";

export function matchRoute(stepRoute: string | RegExp, pathname: string): boolean {
  return stepRoute instanceof RegExp ? stepRoute.test(pathname) : pathname === stepRoute;
}

export function emitTutorialEvent(eventName: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}
