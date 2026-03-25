import { render, screen, fireEvent } from "@testing-library/react";
import ReviewTemplateDetailClient from "@/features/reviews/components/ReviewTemplateDetailClient";
import type { ReviewTemplate } from "@/schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/reviews/actions", () => ({
  addReviewQuestion: jest.fn(),
  removeReviewQuestion: jest.fn(),
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
    {
      id: "q-2",
      text: "Provide feedback on strengths",
      type: "TEXT",
      scaleMin: null,
      scaleMax: null,
      order: 1,
      required: false,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const defaultProps = {
  template: makeTemplate(),
};

describe("ReviewTemplateDetailClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Description ───────────────────────────────────────────

  // Renders template description when present.
  test("renders template description", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByText("Standard performance review template")).toBeInTheDocument();
  });

  // Hides description when null.
  test("hides description when null", () => {
    render(<ReviewTemplateDetailClient template={makeTemplate({ description: null })} />);
    expect(screen.queryByText("Standard performance review template")).not.toBeInTheDocument();
  });

  // ─── Add Question Form ─────────────────────────────────────

  // Renders add question form with question text field.
  test("renders add question form", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Add Question/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Question/i })).toBeInTheDocument();
  });

  // Shows scale min/max fields (spinbuttons) by default for RATING type.
  test("shows scale fields for RATING type", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByRole("spinbutton", { name: /Min/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /Max/i })).toBeInTheDocument();
  });

  // Shows required switch in the form.
  test("shows required switch", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    // MUI Switch renders with the switch ARIA role.
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  // Has submit button with add question label.
  test("has add question submit button", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    const buttons = screen.getAllByText("Add Question");
    // eslint-disable-next-line testing-library/no-node-access
    const submitButton = buttons.find((el) => el.closest("button[type='submit']"));
    expect(submitButton).toBeDefined();
  });

  // ─── Question List ─────────────────────────────────────────

  // Renders questions with text content.
  test("renders questions with text", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByText("Rate overall performance")).toBeInTheDocument();
    expect(screen.getByText("Provide feedback on strengths")).toBeInTheDocument();
  });

  // Shows question count in heading.
  test("shows question count in heading", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByText(/Questions.*\(2\)/)).toBeInTheDocument();
  });

  // Shows type chip for each question.
  test("shows type chips for questions", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    // "Rating scale" appears in both the form Select and the question chip — use getAllByText.
    const ratingScaleElements = screen.getAllByText("Rating scale");
    expect(ratingScaleElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Free text")).toBeInTheDocument();
  });

  // Shows scale range chip for RATING questions.
  test("shows scale range chip for RATING questions", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    expect(screen.getByText("1–5")).toBeInTheDocument();
  });

  // Shows required chip for required questions.
  test("shows required chip for required questions", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    // "Required" appears in the form switch label and as a chip on the required question.
    const requiredElements = screen.getAllByText("Required");
    expect(requiredElements.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Empty Questions ───────────────────────────────────────

  // Shows empty state when template has no questions.
  test("shows empty state when no questions", () => {
    render(<ReviewTemplateDetailClient template={makeTemplate({ questions: [] })} />);
    expect(screen.getByText("No questions added yet")).toBeInTheDocument();
  });

  // ─── Delete Question ───────────────────────────────────────

  // Shows delete button for each question.
  test("shows delete button for each question", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    const deleteIcons = screen.getAllByTestId("DeleteIcon");
    expect(deleteIcons).toHaveLength(2);
  });

  // Opens confirm dialog when delete question button is clicked.
  test("opens confirm dialog when delete is clicked", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    const deleteIcons = screen.getAllByTestId("DeleteIcon");
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcons[0].closest("button")!);
    expect(
      screen.getByText("Are you sure you want to remove this review request?"),
    ).toBeInTheDocument();
  });

  // Cancel button is present in the confirm dialog.
  test("cancel button is present in confirm dialog", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    const deleteIcons = screen.getAllByTestId("DeleteIcon");
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcons[0].closest("button")!);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  // ─── Question Ordering ─────────────────────────────────────

  // Questions are sorted by order field.
  test("questions are sorted by order", () => {
    const template = makeTemplate({
      questions: [
        {
          id: "q-2",
          text: "Second question",
          type: "TEXT",
          scaleMin: null,
          scaleMax: null,
          order: 1,
          required: false,
        },
        {
          id: "q-1",
          text: "First question",
          type: "RATING",
          scaleMin: 1,
          scaleMax: 5,
          order: 0,
          required: true,
        },
      ],
    });
    render(<ReviewTemplateDetailClient template={template} />);
    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveTextContent("First question");
    expect(listItems[1]).toHaveTextContent("Second question");
  });

  // ─── Hidden Template ID ────────────────────────────────────

  // Hidden input contains the template ID.
  test("form contains hidden template ID input", () => {
    render(<ReviewTemplateDetailClient {...defaultProps} />);
    // Hidden inputs have no accessible role — query by display value.
    expect(screen.getByDisplayValue("tmpl-1")).toBeInTheDocument();
  });
});
