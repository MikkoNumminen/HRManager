import { render, screen, fireEvent } from "@testing-library/react";
import ReviewTemplatesClient from "../components/ReviewTemplatesClient";
import type { ReviewTemplate } from "../schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/reviews/actions", () => ({
  createReviewTemplate: jest.fn(),
  deleteReviewTemplate: jest.fn(),
}));

// Mock next/navigation — useRouter used for template detail navigation.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const NOW = new Date("2026-07-01T12:00:00Z");

const makeTemplate = (overrides: Partial<ReviewTemplate> = {}): ReviewTemplate => ({
  id: "tmpl-1",
  name: "Standard Review",
  description: "Standard performance review template",
  questions: [
    {
      id: "q-1",
      text: "Rate overall performance",
      type: "RATING",
      scaleMin: 1,
      scaleMax: 5,
      order: 0,
      required: true,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const defaultProps = {
  templates: [makeTemplate()],
};

describe("ReviewTemplatesClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Create Form ───────────────────────────────────────────

  // Renders the create template form with name and description fields.
  test("renders create template form", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Create Template/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Template Name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Description \(optional\)/i })).toBeInTheDocument();
  });

  // Submit button is present.
  test("submit button is present", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    const buttons = screen.getAllByText("Create Template");
    const submitButton = buttons.find((el) => el.closest("button"));
    expect(submitButton).toBeDefined();
  });

  // ─── Template List ─────────────────────────────────────────

  // Renders template list with name.
  test("renders template list with name", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    expect(screen.getByText("Standard Review")).toBeInTheDocument();
  });

  // Shows description as secondary text when present.
  test("shows description as secondary text", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    expect(screen.getByText("Standard performance review template")).toBeInTheDocument();
  });

  // Shows question count as secondary text when no description.
  test("shows question count when no description", () => {
    render(<ReviewTemplatesClient templates={[makeTemplate({ description: null })]} />);
    // "1 questions" (lowercase from component: questions().toLowerCase())
    expect(screen.getByText(/1 questions/i)).toBeInTheDocument();
  });

  // Renders multiple templates.
  test("renders multiple templates", () => {
    const templates = [
      makeTemplate({ id: "t1", name: "Template A" }),
      makeTemplate({ id: "t2", name: "Template B" }),
    ];
    render(<ReviewTemplatesClient templates={templates} />);
    expect(screen.getByText("Template A")).toBeInTheDocument();
    expect(screen.getByText("Template B")).toBeInTheDocument();
  });

  // ─── Empty State ───────────────────────────────────────────

  // Shows empty state when no templates exist.
  test("shows empty state when no templates exist", () => {
    render(<ReviewTemplatesClient templates={[]} />);
    expect(screen.getByText("No review templates yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create a template to define the questions used in review cycles."),
    ).toBeInTheDocument();
  });

  // ─── Delete Confirmation ───────────────────────────────────

  // Opens confirm dialog when delete button is clicked.
  test("opens confirm dialog when delete button is clicked", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    const deleteIcon = screen.getByTestId("DeleteIcon");
    fireEvent.click(deleteIcon.closest("button")!);
    expect(
      screen.getByText(
        "Are you sure you want to delete this template? Cycles using it will keep their questions snapshot.",
      ),
    ).toBeInTheDocument();
  });

  // Cancel button is present in the confirm dialog.
  test("cancel button is present in confirm dialog", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    const deleteIcon = screen.getByTestId("DeleteIcon");
    fireEvent.click(deleteIcon.closest("button")!);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  // ─── Heading ───────────────────────────────────────────────

  // Renders templates heading.
  test("renders templates heading", () => {
    render(<ReviewTemplatesClient {...defaultProps} />);
    expect(screen.getByText("Templates")).toBeInTheDocument();
  });
});
