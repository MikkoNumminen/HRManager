import { render, screen, fireEvent } from "@testing-library/react";
import GlobalError from "../app/error";

describe("GlobalError", () => {
  // Renders the fallback UI with the error message.
  test("renders error message", () => {
    const error = new Error("Something broke");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  // Shows a default message when the error has no message.
  test("renders default message when error.message is empty", () => {
    const error = new Error("");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });

  // Renders the "Try again" button.
  test("renders try again button", () => {
    const error = new Error("fail");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  // Calls the reset function when the "Try again" button is clicked.
  test("calls reset when try again is clicked", () => {
    const error = new Error("fail");
    const reset = jest.fn();
    render(<GlobalError error={error} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  // Handles errors with a digest property (Next.js production errors).
  test("handles error with digest property", () => {
    const error = Object.assign(new Error("DB connection failed"), { digest: "abc123" });
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("DB connection failed")).toBeInTheDocument();
  });
});
