import { render, screen } from "@testing-library/react";
import ReviewsClient from "@/features/reviews/components/ReviewsClient";
import type { ReviewCycle } from "@/schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/reviews/actions", () => ({
  createReviewCycle: jest.fn(),
}));

// Mock next/navigation — useRouter and useTransition used for card navigation.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const NOW = new Date("2026-07-01T12:00:00Z");

const makeCycle = (overrides: Partial<ReviewCycle> = {}): ReviewCycle => ({
  id: "cycle-1",
  name: "Q3 2026 Review",
  templateId: "tmpl-1",
  templateName: "Standard Review",
  status: "OPEN",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-09-30"),
  requestCount: 10,
  submittedCount: 4,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const defaultProps = {
  cycles: [makeCycle()],
  canManage: true,
  canSubmit: true,
  canView: true,
};

describe("ReviewsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────

  // Renders the create cycle form when canManage is true.
  test("renders create cycle form when canManage is true", () => {
    render(<ReviewsClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Create Cycle/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Cycle Name/i })).toBeInTheDocument();
  });

  // Hides the create cycle form when canManage is false.
  test("hides create cycle form when canManage is false", () => {
    render(<ReviewsClient {...defaultProps} canManage={false} />);
    expect(screen.queryByRole("textbox", { name: /Cycle Name/i })).not.toBeInTheDocument();
  });

  // Renders the heading and My Reviews button when canSubmit is true.
  test("renders heading and My Reviews button when canSubmit is true", () => {
    render(<ReviewsClient {...defaultProps} />);
    expect(screen.getByText("Review Cycles")).toBeInTheDocument();
    expect(screen.getByText("My Reviews")).toBeInTheDocument();
  });

  // Hides My Reviews button when canSubmit is false.
  test("hides My Reviews button when canSubmit is false", () => {
    render(<ReviewsClient {...defaultProps} canSubmit={false} />);
    expect(screen.queryByText("My Reviews")).not.toBeInTheDocument();
  });

  // Shows templates link when canManage is true.
  test("shows templates link when canManage is true", () => {
    render(<ReviewsClient {...defaultProps} />);
    const link = screen.getByText("Templates");
    expect(link.closest("a")).toHaveAttribute("href", "/reviews/templates");
  });

  // ─── Cycle Cards ───────────────────────────────────────────

  // Renders cycle cards with name and template name.
  test("renders cycle card with name and template name", () => {
    render(<ReviewsClient {...defaultProps} />);
    expect(screen.getByText("Q3 2026 Review")).toBeInTheDocument();
    expect(screen.getByText("Standard Review")).toBeInTheDocument();
  });

  // Shows progress bar with submitted/total count when requests exist.
  test("shows progress bar when cycle has requests", () => {
    render(<ReviewsClient {...defaultProps} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("4 of 10 submitted")).toBeInTheDocument();
  });

  // Hides progress bar when requestCount is 0.
  test("hides progress bar when requestCount is 0", () => {
    render(
      <ReviewsClient
        {...defaultProps}
        cycles={[makeCycle({ requestCount: 0, submittedCount: 0 })]}
      />,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // Hides template name when templateName is null.
  test("hides template name when null", () => {
    render(<ReviewsClient {...defaultProps} cycles={[makeCycle({ templateName: null })]} />);
    expect(screen.queryByText("Standard Review")).not.toBeInTheDocument();
  });

  // ─── Empty State ───────────────────────────────────────────

  // Shows empty state when no cycles exist.
  test("shows empty state when no cycles exist", () => {
    render(<ReviewsClient {...defaultProps} cycles={[]} />);
    expect(screen.getByText("No review cycles yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create a cycle to start a review round for your team."),
    ).toBeInTheDocument();
  });

  // ─── Multiple Cycles ──────────────────────────────────────

  // Renders multiple cycle cards.
  test("renders multiple cycle cards", () => {
    const cycles = [
      makeCycle({ id: "c1", name: "Q1 Review" }),
      makeCycle({ id: "c2", name: "Q2 Review" }),
      makeCycle({ id: "c3", name: "Q3 Review" }),
    ];
    render(<ReviewsClient {...defaultProps} cycles={cycles} />);
    expect(screen.getByText("Q1 Review")).toBeInTheDocument();
    expect(screen.getByText("Q2 Review")).toBeInTheDocument();
    expect(screen.getByText("Q3 Review")).toBeInTheDocument();
  });

  // ─── Form Elements ────────────────────────────────────────

  // Create form has date fields (type="date" has no accessible role in JSDOM).
  test("create form has date fields", () => {
    const { container } = render(<ReviewsClient {...defaultProps} />);
    /* eslint-disable testing-library/no-container, testing-library/no-node-access */
    expect(container.querySelector('input[name="startDate"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="endDate"]')).toBeInTheDocument();
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */
  });

  // Submit button is present with create cycle label.
  test("submit button is present", () => {
    render(<ReviewsClient {...defaultProps} />);
    // "Create Cycle" appears as both heading and button.
    const buttons = screen.getAllByText("Create Cycle");
    const submitButton = buttons.find((el) => el.closest("button"));
    expect(submitButton).toBeDefined();
  });

  // My Reviews button links to /reviews/my-reviews.
  test("My Reviews button links correctly", () => {
    render(<ReviewsClient {...defaultProps} />);
    const link = screen.getByText("My Reviews");
    expect(link.closest("a")).toHaveAttribute("href", "/reviews/my-reviews");
  });

  // Shows Team Reviews button when canView is true.
  test("shows Team Reviews button when canView is true", () => {
    render(<ReviewsClient {...defaultProps} canView={true} />);
    const link = screen.getByText("Team Reviews");
    expect(link.closest("a")).toHaveAttribute("href", "/reviews/team-reviews");
  });

  // Hides Team Reviews button when canView is false.
  test("hides Team Reviews button when canView is false", () => {
    render(<ReviewsClient {...defaultProps} canView={false} />);
    expect(screen.queryByText("Team Reviews")).not.toBeInTheDocument();
  });
});
