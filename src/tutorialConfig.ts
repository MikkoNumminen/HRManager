export type TutorialStepId =
  | "view_employees"
  | "add_person"
  | "create_team"
  | "add_member"
  | "create_department"
  | "assign_team_to_department"
  | "manage_permissions"
  | "view_audit_log";

export interface NavigationHint {
  fromRoute: string | RegExp;
  targetSelector: string;
  hintKey: string;
}

export interface TutorialStep {
  id: TutorialStepId;
  route: string | RegExp;
  targetSelector: string;
  event?: string;
  autoCompleteOnRoute?: boolean;
  navigationHints?: NavigationHint[];
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
    navigationHints: [
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='persons-section']",
        hintKey: "nav_click_persons",
      },
    ],
  },
  {
    id: "create_team",
    route: "/manageTeams",
    targetSelector: "[data-tutorial='add-team-form']",
    event: "tutorial:team_created",
    navigationHints: [
      {
        fromRoute: /^\/managePersons/,
        targetSelector: "[data-tutorial='back-button']",
        hintKey: "nav_go_back_home",
      },
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='teams-section']",
        hintKey: "nav_click_teams",
      },
    ],
  },
  {
    id: "add_member",
    route: /^\/manageTeams\/.+/,
    targetSelector: "[data-tutorial='add-member-form']",
    event: "tutorial:member_added",
    navigationHints: [
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='teams-section']",
        hintKey: "nav_click_teams",
      },
      {
        fromRoute: "/manageTeams",
        targetSelector: "[data-tutorial='teams-table']",
        hintKey: "nav_click_a_team",
      },
    ],
  },
  {
    id: "create_department",
    route: "/manageDepartments",
    targetSelector: "[data-tutorial='add-department-form']",
    event: "tutorial:department_created",
    navigationHints: [
      {
        fromRoute: /^\/manageTeams/,
        targetSelector: "[data-tutorial='back-button']",
        hintKey: "nav_go_back_home",
      },
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='departments-section']",
        hintKey: "nav_click_departments",
      },
    ],
  },
  {
    id: "assign_team_to_department",
    route: /^\/manageDepartments\/.+/,
    targetSelector: "[data-tutorial='assign-team-form']",
    event: "tutorial:team_assigned",
    navigationHints: [
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='departments-section']",
        hintKey: "nav_click_departments",
      },
      {
        fromRoute: "/manageDepartments",
        targetSelector: "[data-tutorial='departments-table']",
        hintKey: "nav_click_a_department",
      },
    ],
  },
  {
    id: "manage_permissions",
    route: /^\/admin\/.+/,
    targetSelector: "[data-tutorial='permission-editor']",
    event: "tutorial:permission_updated",
    navigationHints: [
      {
        fromRoute: /^\/manageDepartments/,
        targetSelector: "[data-tutorial='back-button']",
        hintKey: "nav_go_back_home",
      },
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='user-menu-button']",
        hintKey: "nav_open_menu",
      },
      {
        fromRoute: "/admin",
        targetSelector: "[data-tutorial='users-table']",
        hintKey: "nav_click_a_user",
      },
    ],
  },
  {
    id: "view_audit_log",
    route: "/admin/audit",
    targetSelector: "[data-tutorial='audit-log']",
    autoCompleteOnRoute: true,
    navigationHints: [
      {
        fromRoute: /^\/admin\/.+/,
        targetSelector: "[data-tutorial='back-button']",
        hintKey: "nav_go_back_admin",
      },
      {
        fromRoute: "/",
        targetSelector: "[data-tutorial='user-menu-button']",
        hintKey: "nav_open_menu_audit",
      },
      {
        fromRoute: "/admin",
        targetSelector: "[data-tutorial='user-menu-button']",
        hintKey: "nav_open_menu_audit",
      },
    ],
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

export function findNavigationHint(step: TutorialStep, pathname: string): NavigationHint | null {
  if (!step.navigationHints) return null;
  return step.navigationHints.find((hint) => matchRoute(hint.fromRoute, pathname)) ?? null;
}
