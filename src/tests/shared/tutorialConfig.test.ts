import {
  matchRoute,
  emitTutorialEvent,
  completeTutorialStep,
  findNavigationHints,
  TUTORIAL_STEPS,
  DEMO_EMAIL,
  STORAGE_KEY,
} from "@/tutorialConfig";

describe("tutorialConfig", () => {
  // matchRoute matches an exact string route
  test("matchRoute matches exact string route", () => {
    expect(matchRoute("/", "/")).toBe(true);
    expect(matchRoute("/managePersons", "/managePersons")).toBe(true);
  });

  // matchRoute rejects non-matching string route
  test("matchRoute rejects non-matching string route", () => {
    expect(matchRoute("/managePersons", "/manageTeams")).toBe(false);
    expect(matchRoute("/", "/managePersons")).toBe(false);
  });

  // matchRoute matches a RegExp route
  test("matchRoute matches RegExp route", () => {
    expect(matchRoute(/^\/manageTeams\/.+/, "/manageTeams/abc-123")).toBe(true);
    expect(matchRoute(/^\/admin\/.+/, "/admin/user-456")).toBe(true);
  });

  // matchRoute rejects non-matching RegExp route
  test("matchRoute rejects non-matching RegExp route", () => {
    expect(matchRoute(/^\/manageTeams\/.+/, "/manageTeams")).toBe(false);
    expect(matchRoute(/^\/admin\/.+/, "/managePersons/abc")).toBe(false);
  });

  // emitTutorialEvent dispatches a custom event on window
  test("emitTutorialEvent dispatches a custom event on window", () => {
    const handler = jest.fn();
    window.addEventListener("tutorial:test_event", handler);
    emitTutorialEvent("tutorial:test_event");
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("tutorial:test_event", handler);
  });

  // TUTORIAL_STEPS contains exactly 8 steps
  test("TUTORIAL_STEPS contains 8 steps", () => {
    expect(TUTORIAL_STEPS).toHaveLength(8);
  });

  // Each step has a unique id
  test("each step has a unique id", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Each step has a targetSelector and route
  test("each step has a targetSelector and route", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.targetSelector).toBeTruthy();
      expect(step.route).toBeDefined();
    }
  });

  // Steps with autoCompleteOnRoute have no event, and vice versa
  test("auto-complete steps have no event, event steps have no autoCompleteOnRoute", () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.autoCompleteOnRoute) {
        expect(step.event).toBeUndefined();
      }
      if (step.event) {
        expect(step.autoCompleteOnRoute).toBeFalsy();
      }
    }
  });

  // DEMO_EMAIL is the expected demo user email
  test("DEMO_EMAIL is demo@hrmanager.app", () => {
    expect(DEMO_EMAIL).toBe("demo@hrmanager.app");
  });

  // STORAGE_KEY is defined for localStorage
  test("STORAGE_KEY is defined", () => {
    expect(STORAGE_KEY).toBe("hrm_tutorial_progress");
  });

  // The first step is view_employees (auto-complete on home page)
  test("first step is view_employees on /", () => {
    expect(TUTORIAL_STEPS[0].id).toBe("view_employees");
    expect(TUTORIAL_STEPS[0].route).toBe("/");
    expect(TUTORIAL_STEPS[0].autoCompleteOnRoute).toBe(true);
  });

  // The last step is view_audit_log (auto-complete on /admin/audit)
  test("last step is view_audit_log on /admin/audit", () => {
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.id).toBe("view_audit_log");
    expect(last.route).toBe("/admin/audit");
    expect(last.autoCompleteOnRoute).toBe(true);
  });

  // Event-based steps have event names starting with "tutorial:"
  test("event names start with tutorial:", () => {
    const eventSteps = TUTORIAL_STEPS.filter((s) => s.event);
    expect(eventSteps.length).toBeGreaterThan(0);
    for (const step of eventSteps) {
      expect(step.event).toMatch(/^tutorial:/);
    }
  });

  // Most steps have navigation hints (all except view_employees which auto-completes)
  test("action steps have navigation hints", () => {
    const actionSteps = TUTORIAL_STEPS.filter((s) => !s.autoCompleteOnRoute || s.navigationHints);
    for (const step of actionSteps) {
      if (step.id !== "view_employees") {
        expect(step.navigationHints).toBeDefined();
        expect(step.navigationHints!.length).toBeGreaterThan(0);
      }
    }
  });

  // findNavigationHints returns matching hints for the current route
  test("findNavigationHints returns matching hints", () => {
    const createTeamStep = TUTORIAL_STEPS.find((s) => s.id === "create_team")!;
    const hints = findNavigationHints(createTeamStep, "/");
    expect(hints).toHaveLength(1);
    expect(hints[0].hintKey).toBe("nav_click_teams");
  });

  // findNavigationHints returns empty array when no hint matches the route
  test("findNavigationHints returns empty array for non-matching route", () => {
    const createTeamStep = TUTORIAL_STEPS.find((s) => s.id === "create_team")!;
    const hints = findNavigationHints(createTeamStep, "/admin/audit");
    expect(hints).toHaveLength(0);
  });

  // findNavigationHints returns empty array for steps without navigation hints
  test("findNavigationHints returns empty array for steps without hints", () => {
    const viewStep = TUTORIAL_STEPS.find((s) => s.id === "view_employees")!;
    const hints = findNavigationHints(viewStep, "/");
    expect(hints).toHaveLength(0);
  });

  // findNavigationHints matches RegExp fromRoute
  test("findNavigationHints matches RegExp fromRoute", () => {
    const createTeamStep = TUTORIAL_STEPS.find((s) => s.id === "create_team")!;
    const hints = findNavigationHints(createTeamStep, "/managePersons");
    expect(hints).toHaveLength(1);
    expect(hints[0].hintKey).toBe("nav_go_back_home");
  });

  // findNavigationHints returns multiple hints for routes with fallback options
  test("findNavigationHints returns multiple hints for menu-based steps", () => {
    const permStep = TUTORIAL_STEPS.find((s) => s.id === "manage_permissions")!;
    const hints = findNavigationHints(permStep, "/");
    expect(hints.length).toBeGreaterThanOrEqual(2);
    expect(hints[0].targetSelector).toContain("nav-user-management");
    expect(hints[1].targetSelector).toContain("user-menu-button");
  });

  // Navigation hints for back button target the correct selector
  test("back button hints target data-tutorial=back-button", () => {
    const backHints = TUTORIAL_STEPS.flatMap((s) => s.navigationHints ?? []).filter((h) =>
      h.hintKey.includes("go_back"),
    );
    expect(backHints.length).toBeGreaterThan(0);
    for (const hint of backHints) {
      expect(hint.targetSelector).toBe("[data-tutorial='back-button']");
    }
  });

  // completeTutorialStep saves step to localStorage and emits the event
  test("completeTutorialStep saves to localStorage", () => {
    localStorage.clear();
    completeTutorialStep("add_person");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("add_person");
  });

  // completeTutorialStep is idempotent — does not duplicate entries
  test("completeTutorialStep is idempotent", () => {
    localStorage.clear();
    completeTutorialStep("add_person");
    completeTutorialStep("add_person");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored.filter((s: string) => s === "add_person")).toHaveLength(1);
  });

  // completeTutorialStep emits the correct event for the step
  test("completeTutorialStep emits the step event", () => {
    localStorage.clear();
    const handler = jest.fn();
    window.addEventListener("tutorial:person_created", handler);
    completeTutorialStep("add_person");
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("tutorial:person_created", handler);
  });

  // completeTutorialStep does not emit event for auto-complete-only steps (no event defined)
  test("completeTutorialStep does not emit for steps without event", () => {
    localStorage.clear();
    const handler = jest.fn();
    window.addEventListener("tutorial:view_employees", handler);
    completeTutorialStep("view_employees");
    // view_employees has no event property, so no custom event should fire
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("tutorial:view_employees", handler);
    // But it should still save to localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("view_employees");
  });

  // completeTutorialStep appends to existing localStorage entries
  test("completeTutorialStep appends to existing progress", () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["view_employees"]));
    completeTutorialStep("add_person");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("view_employees");
    expect(stored).toContain("add_person");
  });
});
