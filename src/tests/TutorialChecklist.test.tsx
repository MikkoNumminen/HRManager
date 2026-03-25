import { render, screen, fireEvent } from "@testing-library/react";
import TutorialChecklist from "../components/shared/TutorialChecklist";
import { useTutorial } from "../components/shared/TutorialProvider";
import { TUTORIAL_STEPS, TutorialStepId } from "../tutorialConfig";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: null }),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: jest.fn().mockReturnValue("/"),
}));

jest.mock("../components/shared/TutorialProvider", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
  useTutorial: jest.fn(),
  useTutorialMaybe: jest.fn(),
}));

const mockUseTutorial = useTutorial as jest.Mock;

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    steps: TUTORIAL_STEPS,
    completedSteps: new Set<TutorialStepId>(["view_employees"]),
    currentStep: TUTORIAL_STEPS[1],
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

describe("TutorialChecklist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders nothing when tutorial is not active
  test("renders nothing when not active", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ isActive: false }));
    const { container } = render(<TutorialChecklist />);
    expect(container).toBeEmptyDOMElement();
  });

  // Renders the checklist title
  test("renders checklist title", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    expect(screen.getByText("Demo Tour")).toBeInTheDocument();
  });

  // Shows progress count
  test("shows progress count", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    expect(screen.getByText("1 of 8 complete")).toBeInTheDocument();
  });

  // Renders all 8 step names
  test("renders all 8 step names", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    expect(screen.getByText("View employees")).toBeInTheDocument();
    expect(screen.getByText("Add a person")).toBeInTheDocument();
    expect(screen.getByText("Create a team")).toBeInTheDocument();
    expect(screen.getByText("Add a team member")).toBeInTheDocument();
    expect(screen.getByText("Create a department")).toBeInTheDocument();
    expect(screen.getByText("Assign a team to a department")).toBeInTheDocument();
    expect(screen.getByText("Manage user permissions")).toBeInTheDocument();
    expect(screen.getByText("View the audit log")).toBeInTheDocument();
  });

  // Completed steps show a check icon
  test("shows check icon for completed steps", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    // One step completed = one CheckCircleIcon
    expect(screen.getAllByTestId("CheckCircleIcon")).toHaveLength(1);
  });

  // Incomplete steps show an unchecked circle icon
  test("shows unchecked icon for incomplete steps", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    // 7 incomplete steps = 7 RadioButtonUncheckedIcon
    expect(screen.getAllByTestId("RadioButtonUncheckedIcon")).toHaveLength(7);
  });

  // Clicking an incomplete step with a string route navigates to it
  test("clicking incomplete step navigates to its route", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    fireEvent.click(screen.getByText("Add a person"));
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // Clicking a completed step does not navigate
  test("clicking completed step does not navigate", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    fireEvent.click(screen.getByText("View employees"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Clicking a step with a RegExp route does not navigate (no navigable route)
  test("clicking step with RegExp route does not navigate", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    // "Add a team member" has route /^\/manageTeams\/.+/ (RegExp)
    fireEvent.click(screen.getByText("Add a team member"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  // The collapse can be toggled by clicking the header
  test("collapses and expands the list", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);

    // Initially expanded — step names visible
    expect(screen.getByText("Add a person")).toBeVisible();

    // Click to collapse
    fireEvent.click(screen.getByText("Demo Tour"));

    // Click to expand again
    fireEvent.click(screen.getByText("Demo Tour"));
    expect(screen.getByText("Add a person")).toBeVisible();
  });

  // Shows "Restart Tour" button when all steps are complete
  test("shows restart button when all complete", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ allComplete: true }));
    render(<TutorialChecklist />);
    expect(screen.getByText("Restart Tour")).toBeInTheDocument();
  });

  // Does not show "Restart Tour" when not all complete
  test("hides restart button when not all complete", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ allComplete: false }));
    render(<TutorialChecklist />);
    expect(screen.queryByText("Restart Tour")).not.toBeInTheDocument();
  });

  // Clicking "Restart Tour" calls resetTutorial
  test("restart button calls resetTutorial", () => {
    const resetTutorial = jest.fn();
    mockUseTutorial.mockReturnValue(createMockContext({ allComplete: true, resetTutorial }));
    render(<TutorialChecklist />);
    fireEvent.click(screen.getByText("Restart Tour"));
    expect(resetTutorial).toHaveBeenCalledTimes(1);
  });

  // Shows the school icon in the header
  test("shows school icon", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    expect(screen.getByTestId("SchoolIcon")).toBeInTheDocument();
  });

  // Progress bar is rendered
  test("renders progress bar", () => {
    mockUseTutorial.mockReturnValue(createMockContext());
    render(<TutorialChecklist />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // Progress bar value matches completion percentage
  test("progress bar reflects completion percentage", () => {
    mockUseTutorial.mockReturnValue(createMockContext({ completedCount: 4, totalSteps: 8 }));
    render(<TutorialChecklist />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  // Full completion shows 100% progress
  test("full completion shows 100% progress", () => {
    mockUseTutorial.mockReturnValue(
      createMockContext({ completedCount: 8, totalSteps: 8, allComplete: true }),
    );
    render(<TutorialChecklist />);
    expect(screen.getByText("8 of 8 complete")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
