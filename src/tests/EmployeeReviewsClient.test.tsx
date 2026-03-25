import { render, screen } from "@testing-library/react";
import EmployeeReviewsClient from "@/components/EmployeeReviewsClient";
import { ReviewRequest } from "@/schemas";

const makeReview = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: "r1",
  cycleId: "c1",
  cycleName: "Q1 2025",
  cycleStatus: "OPEN",
  subjectId: "p1",
  subjectName: "Alice",
  reviewerId: "p2",
  reviewerName: "Bob",
  type: "MANAGER",
  status: "PENDING",
  createdAt: new Date("2025-01-15"),
  ...overrides,
});

describe("EmployeeReviewsClient", () => {
  // Shows a read-only notice at the top.
  test("renders read-only alert", () => {
    render(<EmployeeReviewsClient reviews={[]} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  // Shows empty state when no reviews exist.
  test("shows no reviews message when empty", () => {
    render(<EmployeeReviewsClient reviews={[]} />);
    expect(screen.getByText(/no performance reviews/i)).toBeInTheDocument();
  });

  // Renders cycle name in the reviews table.
  test("renders cycle name", () => {
    render(<EmployeeReviewsClient reviews={[makeReview()]} />);
    expect(screen.getByText("Q1 2025")).toBeInTheDocument();
  });

  // Renders the reviewer's name.
  test("renders reviewer name", () => {
    render(<EmployeeReviewsClient reviews={[makeReview()]} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  // Shows "Unassigned" when no reviewer is set.
  test("shows unassigned when reviewer is null", () => {
    render(
      <EmployeeReviewsClient reviews={[makeReview({ reviewerId: null, reviewerName: null })]} />,
    );
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
  });

  // Shows type chip for manager review.
  test("renders MANAGER review type chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ type: "MANAGER" })]} />);
    // Use exact text to avoid matching "HRManager" in the read-only notice
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  // Shows type chip for self review.
  test("renders SELF review type chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ type: "SELF" })]} />);
    expect(screen.getByText(/self/i)).toBeInTheDocument();
  });

  // Shows type chip for peer review.
  test("renders PEER review type chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ type: "PEER" })]} />);
    expect(screen.getByText(/peer/i)).toBeInTheDocument();
  });

  // Shows type chip for direct report review.
  test("renders DIRECT_REPORT review type chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ type: "DIRECT_REPORT" })]} />);
    expect(screen.getByText(/direct report/i)).toBeInTheDocument();
  });

  // Shows PENDING status chip.
  test("renders PENDING status chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ status: "PENDING" })]} />);
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
  });

  // Shows SUBMITTED status chip.
  test("renders SUBMITTED status chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ status: "SUBMITTED" })]} />);
    expect(screen.getByText(/submitted/i)).toBeInTheDocument();
  });

  // Shows cycle status OPEN chip.
  test("renders OPEN cycle status chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ cycleStatus: "OPEN" })]} />);
    expect(screen.getByText(/open/i)).toBeInTheDocument();
  });

  // Shows cycle status CLOSED chip.
  test("renders CLOSED cycle status chip", () => {
    render(<EmployeeReviewsClient reviews={[makeReview({ cycleStatus: "CLOSED" })]} />);
    expect(screen.getByText(/closed/i)).toBeInTheDocument();
  });

  // Can render multiple review rows.
  test("renders multiple review rows", () => {
    const reviews = [
      makeReview({ id: "r1", cycleName: "Q1 2025" }),
      makeReview({ id: "r2", cycleName: "Q2 2025" }),
    ];
    render(<EmployeeReviewsClient reviews={reviews} />);
    expect(screen.getByText("Q1 2025")).toBeInTheDocument();
    expect(screen.getByText("Q2 2025")).toBeInTheDocument();
  });
});
