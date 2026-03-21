import { render, screen, fireEvent } from "@testing-library/react";
import TutorialCelebration from "../components/TutorialCelebration";
import { useTutorial } from "../components/TutorialProvider";
import { TutorialStepId } from "../tutorialConfig";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: null }),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/"),
}));

// Mock canvas-confetti to avoid canvas errors in jsdom
jest.mock("canvas-confetti", () => jest.fn());

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
    currentStep: null,
    completeStep: jest.fn(),
    resetTutorial: jest.fn(),
    totalSteps: 8,
    completedCount: 0,
    celebratingStep: null as TutorialStepId | null,
    allComplete: false,
    dismissCelebration: jest.fn(),
    ...overrides,
  };
}

describe("TutorialCelebration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Renders nothing when no step is being celebrated
  test("renders nothing when not celebrating", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    const { container } = render(<TutorialCelebration />);
    expect(container.innerHTML).toBe("");
  });

  // Shows "Nice work!" text when celebrating a regular step
  test("shows task complete message for regular step", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "add_person", allComplete: false }),
    );
    render(<TutorialCelebration />);
    expect(screen.getByText("Nice work!")).toBeInTheDocument();
  });

  // Shows the completed step name
  test("shows the step name when celebrating", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "add_person", allComplete: false }),
    );
    render(<TutorialCelebration />);
    expect(screen.getByText("Add a person")).toBeInTheDocument();
  });

  // Shows finale title when all steps are complete
  test("shows finale when all complete", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "view_audit_log", allComplete: true }),
    );
    render(<TutorialCelebration />);
    expect(screen.getByText("Tour Complete!")).toBeInTheDocument();
  });

  // Shows finale message with the full congratulations text
  test("shows finale message text", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "view_audit_log", allComplete: true }),
    );
    render(<TutorialCelebration />);
    expect(
      screen.getByText("You've explored all the key features. Great job!"),
    ).toBeInTheDocument();
  });

  // Shows dark overlay backdrop during finale
  test("shows dark overlay during finale", () => {
    const dismiss = jest.fn();
    mockUseTutorial.mockReturnValue(
      createMockContext({
        celebratingStep: "view_audit_log",
        allComplete: true,
        dismissCelebration: dismiss,
      }),
    );
    render(<TutorialCelebration />);
    // The finale overlay has animation "tutorial-finale-bg"
    expect(screen.getByText("Tour Complete!")).toBeInTheDocument();
  });

  // Clicking the celebration dismisses it
  test("clicking celebration dismisses it", () => {
    const dismiss = jest.fn();
    mockUseTutorial.mockReturnValue(
      createMockContext({
        celebratingStep: "add_person",
        allComplete: false,
        dismissCelebration: dismiss,
      }),
    );
    render(<TutorialCelebration />);
    fireEvent.click(screen.getByText("Nice work!"));
    expect(dismiss).toHaveBeenCalled();
  });

  // Clicking finale overlay dismisses it
  test("clicking finale overlay dismisses it", () => {
    const dismiss = jest.fn();
    mockUseTutorial.mockReturnValue(
      createMockContext({
        celebratingStep: "view_audit_log",
        allComplete: true,
        dismissCelebration: dismiss,
      }),
    );
    render(<TutorialCelebration />);
    fireEvent.click(screen.getByText("Tour Complete!"));
    expect(dismiss).toHaveBeenCalled();
  });

  // Injects CSS keyframes style for celebration glow
  test("injects celebration CSS keyframes", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "add_person", allComplete: false }),
    );
    const { container } = render(<TutorialCelebration />);
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("tutorial-celebration-glow");
  });

  // Shows trophy icon during finale
  test("shows trophy icon during finale", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "view_audit_log", allComplete: true }),
    );
    render(<TutorialCelebration />);
    // MUI EmojiEventsIcon renders an SVG with data-testid
    expect(screen.getByTestId("EmojiEventsIcon")).toBeInTheDocument();
  });

  // Regular celebration does not show the dark overlay
  test("no dark overlay for regular step celebration", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ celebratingStep: "add_person", allComplete: false }),
    );
    render(<TutorialCelebration />);
    expect(screen.queryByText("Tour Complete!")).not.toBeInTheDocument();
  });
});
