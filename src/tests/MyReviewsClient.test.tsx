import { render, screen } from "@testing-library/react";
import MyReviewsClient from "../components/MyReviewsClient";

describe("MyReviewsClient", () => {
  // Renders the pending reviews heading.
  test("renders pending reviews heading", () => {
    render(<MyReviewsClient />);
    expect(screen.getByText("Pending Reviews")).toBeInTheDocument();
  });

  // Shows hint text when no reviews are available.
  test("shows no-reviews hint text", () => {
    render(<MyReviewsClient />);
    expect(screen.getByText("You have no reviews to complete at this time.")).toBeInTheDocument();
  });

  // Renders back link to review cycles page.
  test("renders link to review cycles page", () => {
    render(<MyReviewsClient />);
    const link = screen.getByText("Review Cycles");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/reviews");
  });

  // Renders the assignment icon.
  test("renders assignment icon", () => {
    render(<MyReviewsClient />);
    expect(screen.getByTestId("AssignmentIcon")).toBeInTheDocument();
  });
});
