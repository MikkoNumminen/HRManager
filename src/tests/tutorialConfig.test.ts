import {
  matchRoute,
  emitTutorialEvent,
  TUTORIAL_STEPS,
  DEMO_EMAIL,
  STORAGE_KEY,
} from "../tutorialConfig";

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
});
