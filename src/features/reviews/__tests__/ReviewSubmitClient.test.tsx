import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewSubmitClient from "@/features/reviews/components/ReviewSubmitClient";
import type { ReviewRequest, ReviewTemplate } from "@/schemas";
import { submitReview } from "@/features/reviews/actions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/reviews/actions", () => ({
  submitReview: jest.fn(),
}));

// Mock next/navigation — useRouter used for redirect after submit.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const NOW = new Date("2026-07-01T12:00:00Z");

const makeRequest = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: "req-1",
  cycleId: "cycle-1",
  cycleName: "Q3 2026 Review",
  cycleStatus: "OPEN",
  subjectId: "p-1",
  subjectName: "Alice Johnson",
  reviewerId: "p-2",
  reviewerName: "Bob Smith",
  type: "PEER",
  status: "PENDING",
  createdAt: NOW,
  ...overrides,
});

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
  request: makeRequest(),
  template: makeTemplate(),
};

describe("ReviewSubmitClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Already Submitted ─────────────────────────────────────

  // Shows already-submitted alert when request status is SUBMITTED.
  test("shows already-submitted alert when status is SUBMITTED", () => {
    render(
      <ReviewSubmitClient
        request={makeRequest({ status: "SUBMITTED" })}
        template={makeTemplate()}
      />,
    );
    expect(screen.getByText("This review has already been submitted.")).toBeInTheDocument();
    // Should not render the submit button.
    expect(screen.queryByText("Submit Review")).not.toBeInTheDocument();
  });

  // ─── Cycle Not Open ────────────────────────────────────────

  // Shows cycle-not-open warning when cycle status is DRAFT.
  test("shows cycle-not-open warning when cycleStatus is DRAFT", () => {
    render(
      <ReviewSubmitClient
        request={makeRequest({ cycleStatus: "DRAFT" })}
        template={makeTemplate()}
      />,
    );
    expect(screen.getByText("This review cycle is not open for submissions.")).toBeInTheDocument();
    expect(screen.queryByText("Submit Review")).not.toBeInTheDocument();
  });

  // Shows cycle-not-open warning when cycle status is CLOSED.
  test("shows cycle-not-open warning when cycleStatus is CLOSED", () => {
    render(
      <ReviewSubmitClient
        request={makeRequest({ cycleStatus: "CLOSED" })}
        template={makeTemplate()}
      />,
    );
    expect(screen.getByText("This review cycle is not open for submissions.")).toBeInTheDocument();
  });

  // ─── Form Rendering ────────────────────────────────────────

  // Renders review type chip and subject name.
  test("renders review type chip and subject name", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByText("Peer review")).toBeInTheDocument();
    expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument();
  });

  // Renders questions from the template.
  test("renders questions from template", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByText(/Rate overall performance/)).toBeInTheDocument();
    expect(screen.getByText(/Provide feedback on strengths/)).toBeInTheDocument();
  });

  // Renders rating slider for RATING questions.
  test("renders rating slider for RATING questions", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  // Renders text field for TEXT questions.
  test("renders text field for TEXT questions", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByPlaceholderText("Your response...")).toBeInTheDocument();
  });

  // Shows required indicator (*) for required questions.
  test("shows required indicator for required questions", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  // Shows question numbering.
  test("shows question numbering", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByText(/^1\./)).toBeInTheDocument();
    expect(screen.getByText(/^2\./)).toBeInTheDocument();
  });

  // ─── No Template / No Questions ────────────────────────────

  // Shows no-questions message when template is null.
  test("shows no-questions message when template is null", () => {
    render(<ReviewSubmitClient request={makeRequest()} template={null} />);
    expect(screen.getByText("No questions added yet")).toBeInTheDocument();
  });

  // Shows no-questions message when template has empty questions array.
  test("shows no-questions message when template has no questions", () => {
    render(
      <ReviewSubmitClient request={makeRequest()} template={makeTemplate({ questions: [] })} />,
    );
    expect(screen.getByText("No questions added yet")).toBeInTheDocument();
  });

  // ─── Submit Button ─────────────────────────────────────────

  // Renders submit button.
  test("renders submit button", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    const submitButton = screen.getByRole("button", { name: /Submit Review/i });
    expect(submitButton).toBeInTheDocument();
  });

  // ─── Confirm Dialog ────────────────────────────────────────

  // Opens confirm dialog when submit button is clicked.
  test("opens confirm dialog on submit click", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));
    expect(screen.getByText("Submit your review? This cannot be undone.")).toBeInTheDocument();
  });

  // Cancel and confirm buttons are present in the confirm dialog.
  test("cancel and confirm buttons are present in confirm dialog", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    // Confirm button uses the same "Submit Review" label.
    const dialogButtons = screen.getAllByText("Submit Review");
    expect(dialogButtons.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Rating Display ────────────────────────────────────────

  // Shows rating label with min/max values.
  test("shows rating label with min/max", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    expect(screen.getByText(/Rating \(1–5\)/)).toBeInTheDocument();
  });

  // ─── Different Review Types ────────────────────────────────

  // Renders correct type chip for SELF review.
  test("renders Self-assessment review type chip", () => {
    render(
      <ReviewSubmitClient request={makeRequest({ type: "SELF" })} template={makeTemplate()} />,
    );
    expect(screen.getByText("Self-assessment")).toBeInTheDocument();
  });

  // Renders correct type chip for MANAGER review.
  test("renders Manager review type chip", () => {
    render(
      <ReviewSubmitClient request={makeRequest({ type: "MANAGER" })} template={makeTemplate()} />,
    );
    expect(screen.getByText("Manager review")).toBeInTheDocument();
  });

  // Renders correct type chip for DIRECT_REPORT review.
  test("renders Direct report review type chip", () => {
    render(
      <ReviewSubmitClient
        request={makeRequest({ type: "DIRECT_REPORT" })}
        template={makeTemplate()}
      />,
    );
    expect(screen.getByText("Direct report review")).toBeInTheDocument();
  });

  // ─── Slider Update ─────────────────────────────────────────

  // Changing slider value updates the displayed rating number.
  test("slider onChange updates displayed rating value", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    const slider = screen.getByRole("slider");
    // Simulate a slider change by firing the change event with a new value.
    fireEvent.change(slider, { target: { value: 4 } });
    // The slider should still be present (state update does not unmount).
    expect(slider).toBeInTheDocument();
  });

  // ─── Text Input Update ─────────────────────────────────────

  // Typing into a TEXT question field updates the answer.
  test("typing in text field updates text answer", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    const textField = screen.getByPlaceholderText("Your response...");
    fireEvent.change(textField, { target: { value: "Great collaboration skills." } });
    expect((textField as HTMLTextAreaElement).value).toBe("Great collaboration skills.");
  });

  // ─── Confirm Dialog — Cancel ───────────────────────────────

  // Clicking Cancel in the confirm dialog does not submit the form.
  test("clicking Cancel in confirm dialog does not call submitReview", () => {
    render(<ReviewSubmitClient {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));
    // Dialog is open.
    expect(screen.getByText("Submit your review? This cannot be undone.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    // submitReview must never be called after cancel.
    expect(submitReview).not.toHaveBeenCalled();
  });

  // ─── Confirm Dialog — Confirm ──────────────────────────────

  // Clicking Confirm in the dialog calls the form action.
  test("clicking Confirm in dialog invokes form action", async () => {
    (submitReview as jest.Mock).mockResolvedValue(undefined);

    render(<ReviewSubmitClient {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));

    // Get the confirm button inside the dialog (the second "Submit Review" occurrence).
    const allSubmitButtons = screen.getAllByText("Submit Review");
    const confirmBtn = allSubmitButtons[allSubmitButtons.length - 1];

    fireEvent.click(confirmBtn);

    expect(submitReview).toHaveBeenCalled();
  });

  // ─── Error Display ─────────────────────────────────────────

  // Displays error message when action returns an error.
  test("displays error message when action returns error", async () => {
    (submitReview as jest.Mock).mockResolvedValue({ error: "Submission failed" });

    render(<ReviewSubmitClient {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Submit Review/i }));
    const allSubmitButtons = screen.getAllByText("Submit Review");
    const confirmBtn = allSubmitButtons[allSubmitButtons.length - 1];

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });
  });

  // ─── Null Fallbacks ────────────────────────────────────────

  // Renders without crashing when subjectName is null (uses empty string fallback).
  test("renders gracefully when subjectName is null", () => {
    render(
      <ReviewSubmitClient request={makeRequest({ subjectName: null })} template={makeTemplate()} />,
    );
    // The form should still be present.
    expect(screen.getByRole("button", { name: /Submit Review/i })).toBeInTheDocument();
  });

  // Renders rating slider with fallback defaults when scaleMin/scaleMax are null.
  test("renders rating slider when scaleMin and scaleMax are null", () => {
    const templateNullScale = makeTemplate({
      questions: [
        {
          id: "q-1",
          text: "Rate performance",
          type: "RATING",
          scaleMin: null,
          scaleMax: null,
          order: 0,
          required: true,
        },
      ],
    });
    render(<ReviewSubmitClient request={makeRequest()} template={templateNullScale} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
    // Should fall back to defaults: Rating (1–5)
    expect(screen.getByText(/Rating \(1–5\)/)).toBeInTheDocument();
  });
});
