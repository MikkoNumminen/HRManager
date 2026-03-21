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
    expect(container.innerHTML).toBe("");
  });

  // Renders nothing when no current step
  test("renders nothing when no current step", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ currentStep: null }));
    const { container } = render(<TutorialSpotlight />);
    expect(container.innerHTML).toBe("");
  });

  // Renders nothing when on a different route than the current step
  test("renders nothing when route does not match", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/manageTeams");
    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialSpotlight />);
    expect(container.innerHTML).toBe("");
  });

  // Renders nothing when target element does not exist in DOM
  test("renders nothing when target element not found in DOM", () => {
    const { usePathname } = require("next/navigation");
    usePathname.mockReturnValue("/managePersons");
    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialSpotlight />);
    // No element with data-tutorial='add-person-form' in the DOM
    expect(container.querySelector(".MuiPopper-root")).toBeNull();
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
    expect(target.classList.contains("tutorial-spotlight-target")).toBe(true);
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

    expect(target.classList.contains("tutorial-spotlight-target")).toBe(true);
    unmount();
    expect(target.classList.contains("tutorial-spotlight-target")).toBe(false);
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

    expect(target.classList.contains("tutorial-spotlight-target")).toBe(true);
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

    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("tutorial-pulse");
  });
});
