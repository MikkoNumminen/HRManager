import { render, screen } from "@testing-library/react";
import TutorialSpotlight from "../components/TutorialSpotlight";
import { useTutorial } from "../components/TutorialProvider";
import { TutorialStepId } from "../tutorialConfig";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: null }),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/managePersons"),
}));

jest.mock("../components/TutorialProvider", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
  useTutorial: jest.fn(),
  useTutorialMaybe: jest.fn(),
}));

const mockUseTutorial = useTutorial as jest.Mock;

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    steps: [],
    completedSteps: new Set<TutorialStepId>(),
    currentStep: {
      id: "add_person" as TutorialStepId,
      route: "/managePersons",
      targetSelector: "[data-tutorial='add-person-form']",
      event: "tutorial:person_created",
    },
    completeStep: jest.fn(),
    resetTutorial: jest.fn(),
    totalSteps: 8,
    completedCount: 1,
    celebratingStep: null,
    allComplete: false,
    dismissCelebration: jest.fn(),
    ...overrides,
  };
}

describe("TutorialSpotlight", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  // Renders nothing when tutorial is not active
  test("renders nothing when not active", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ isActive: false }));
    const { container } = render(<TutorialSpotlight />);
    expect(container).toBeEmptyDOMElement();
  });

  // Renders nothing when no current step
  test("renders nothing when no current step", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ currentStep: null }));
    const { container } = render(<TutorialSpotlight />);
    expect(container).toBeEmptyDOMElement();
  });

  // Renders nothing when on a different route than the current step
  test("renders nothing when route does not match", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/manageTeams");
    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialSpotlight />);
    expect(container).toBeEmptyDOMElement();
  });

  // Renders nothing when target element does not exist in DOM
  test("renders nothing when target element not found in DOM", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");
    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialSpotlight />);
    // No element with data-tutorial='add-person-form' in the DOM
    expect(container).toBeEmptyDOMElement();
  });

  // Renders spotlight when all conditions are met (active, route match, target exists)
  test("renders spotlight when active, route matches, and target exists", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    // Create a target element in the DOM
    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialSpotlight />);

    // Should inject the glow CSS class on the target
    expect(target).toHaveClass("tutorial-spotlight-target");
  });

  // Shows the step title from translations
  test("shows the step title text", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialSpotlight />);

    // Translation mock returns the key "step_add_person" → en.json "Add a person"
    expect(screen.getByText("Add a person")).toBeInTheDocument();
  });

  // Shows the hint text from translations
  test("shows the hint text", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialSpotlight />);

    expect(
      screen.getByText("Fill in a name and email to add a new employee to the system."),
    ).toBeInTheDocument();
  });

  // Shows the step number badge
  test("shows the step number badge", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext({ completedCount: 1 }));
    render(<TutorialSpotlight />);

    // completedSteps.size + 1 = 0 + 1 = 1 (since completedSteps set is empty in mock)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // Cleans up glow class when unmounting
  test("removes glow class on unmount", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { unmount } = render(<TutorialSpotlight />);

    expect(target).toHaveClass("tutorial-spotlight-target");
    unmount();
    expect(target).not.toHaveClass("tutorial-spotlight-target");
  });

  // Handles RegExp route matching for dynamic routes
  test("matches RegExp route for dynamic pages", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/manageTeams/abc-123");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-member-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(
      createMockContext({
        currentStep: {
          id: "add_member",
          route: /^\/manageTeams\/.+/,
          targetSelector: "[data-tutorial='add-member-form']",
          event: "tutorial:member_added",
        },
      }),
    );
    render(<TutorialSpotlight />);

    expect(target).toHaveClass("tutorial-spotlight-target");
  });

  // Injects the CSS keyframes style tag
  test("injects CSS keyframes style", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialSpotlight />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("tutorial-pulse");
  });

  // Shows navigation hint when not on the step's route but on a hinted route
  test("shows navigation hint on a different page", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/");

    // Create a target matching the nav hint selector for "add_person" step from "/"
    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "persons-section");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(
      createMockContext({
        currentStep: {
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
      }),
    );
    render(<TutorialSpotlight />);

    expect(target).toHaveClass("tutorial-spotlight-target");
    expect(screen.getByText("Click the Persons section to manage employees.")).toBeInTheDocument();
  });

  // Shows back button hint when navigating away from a completed step
  test("shows back button hint for navigation", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const backBtn = document.createElement("button");
    backBtn.setAttribute("data-tutorial", "back-button");
    document.body.appendChild(backBtn);

    mockUseTutorial.mockReturnValue(
      createMockContext({
        currentStep: {
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
          ],
        },
      }),
    );
    render(<TutorialSpotlight />);

    expect(backBtn).toHaveClass("tutorial-spotlight-target");
    expect(
      screen.getByText("Click the back arrow to return to the home page."),
    ).toBeInTheDocument();
  });

  // Removes spotlight class from previous target when tutorial becomes inactive
  test("removes class from previous target when tutorial becomes inactive", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { rerender } = render(<TutorialSpotlight />);
    expect(target).toHaveClass("tutorial-spotlight-target");

    // Tutorial becomes inactive
    mockUseTutorial.mockReturnValue(createMockContext({ isActive: false }));
    rerender(<TutorialSpotlight />);
    expect(target).not.toHaveClass("tutorial-spotlight-target");
  });

  // Removes spotlight class from previous target when current step becomes null
  test("removes class from previous target when step becomes null", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { rerender } = render(<TutorialSpotlight />);
    expect(target).toHaveClass("tutorial-spotlight-target");

    // Step becomes null (all complete)
    mockUseTutorial.mockReturnValue(createMockContext({ currentStep: null }));
    rerender(<TutorialSpotlight />);
    expect(target).not.toHaveClass("tutorial-spotlight-target");
  });

  // Switches spotlight from old target to new target when step changes
  test("switches spotlight to new target when step changes", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    const target1 = document.createElement("div");
    target1.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target1);

    const target2 = document.createElement("div");
    target2.setAttribute("data-tutorial", "change-position-form");
    document.body.appendChild(target2);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { rerender } = render(<TutorialSpotlight />);
    expect(target1).toHaveClass("tutorial-spotlight-target");

    // Step changes to target a different element
    mockUseTutorial.mockReturnValue(
      createMockContext({
        currentStep: {
          id: "change_position" as TutorialStepId,
          route: "/managePersons",
          targetSelector: "[data-tutorial='change-position-form']",
          event: "tutorial:position_changed",
        },
      }),
    );
    rerender(<TutorialSpotlight />);
    expect(target1).not.toHaveClass("tutorial-spotlight-target");
    expect(target2).toHaveClass("tutorial-spotlight-target");
  });

  // Removes spotlight class from old target via MutationObserver when the DOM element changes
  test("removes class from old target when DOM element changes via MutationObserver", async () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    // Capture the MutationObserver callback so we can trigger it manually
    let observerCallback: MutationCallback | null = null;
    const originalMO = globalThis.MutationObserver;
    globalThis.MutationObserver = class MockMutationObserver {
      constructor(cb: MutationCallback) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof MutationObserver;

    const target1 = document.createElement("div");
    target1.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target1);

    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialSpotlight />);
    expect(target1).toHaveClass("tutorial-spotlight-target");

    // Swap target1 for a different element with the same selector
    document.body.removeChild(target1);
    const target2 = document.createElement("div");
    target2.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target2);

    // Fire the observer callback — findTarget() runs, finds target2 (different from target1),
    // so it removes the class from the old target (L74) and adds it to the new one
    const { act } = require("@testing-library/react");
    await act(() => {
      observerCallback!([], {} as MutationObserver);
    });

    expect(target1).not.toHaveClass("tutorial-spotlight-target");
    expect(target2).toHaveClass("tutorial-spotlight-target");

    globalThis.MutationObserver = originalMO;
  });

  // Removes spotlight class from previous target when effect re-runs with isActive=false
  // and previousTargetRef is still set (cleanup threw, leaving the ref non-null)
  test("removes class from previous target in effect body when cleanup fails to clear ref", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");

    // Mock MutationObserver to prevent actual observer behavior
    const originalMO = globalThis.MutationObserver;
    globalThis.MutationObserver = class MockMutationObserver {
      constructor() {}
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof MutationObserver;

    const target = document.createElement("div");
    target.setAttribute("data-tutorial", "add-person-form");
    document.body.appendChild(target);

    mockUseTutorial.mockReturnValue(createMockContext());
    const { rerender } = render(<TutorialSpotlight />);
    expect(target).toHaveClass("tutorial-spotlight-target");

    // Make classList.remove throw on the first call (from cleanup at L98),
    // which prevents L99 from executing, leaving previousTargetRef.current non-null.
    // The second call (from effect body at L48) will succeed normally.
    const origRemove = target.classList.remove.bind(target.classList);
    let callCount = 0;
    target.classList.remove = jest.fn((...args: string[]) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("simulated cleanup failure");
      }
      return origRemove(...args);
    });

    // Suppress the expected React error from the cleanup throwing
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Re-render with isActive=false — cleanup throws at L98 (leaving ref non-null),
    // then effect body at L47 finds the ref and executes L48-49.
    // React re-throws cleanup errors, so we catch it here.
    mockUseTutorial.mockReturnValue(createMockContext({ isActive: false }));
    try {
      rerender(<TutorialSpotlight />);
    } catch {
      // Expected: React propagates the cleanup error
    }

    // classList.remove was called twice: once by cleanup (threw), once by effect body (L48)
    expect(target.classList.remove).toHaveBeenCalledTimes(2);
    expect(target.classList.remove).toHaveBeenCalledWith("tutorial-spotlight-target");

    consoleSpy.mockRestore();
    globalThis.MutationObserver = originalMO;
  });

  // Renders nothing when not on step route and no matching navigation hint
  test("renders nothing when no matching navigation hint", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/some-random-page");

    mockUseTutorial.mockReturnValue(
      createMockContext({
        currentStep: {
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
      }),
    );
    const { container } = render(<TutorialSpotlight />);
    expect(container).toBeEmptyDOMElement();
  });
});
