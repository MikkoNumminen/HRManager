import { render, screen, fireEvent } from "@testing-library/react";
import GlobalError from "../app/error";

describe("GlobalError", () => {
  // Shows generic message instead of raw error details (prevents info disclosure).
  test("shows generic message, not raw error.message", () => {
    const error = new Error("DB connection failed: password invalid");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    expect(screen.queryByText("DB connection failed")).not.toBeInTheDocument();
  });

  // Shows the generic message for empty error messages too.
  test("renders generic message when error.message is empty", () => {
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

  // Shows the digest reference code when present (for support purposes).
  test("shows digest reference when present", () => {
    const error = Object.assign(new Error("internal error"), { digest: "abc123" });
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
    expect(screen.queryByText("internal error")).not.toBeInTheDocument();
  });

  // Does not show digest section when digest is not present.
  test("hides digest reference when not present", () => {
    const error = new Error("something");
    render(<GlobalError error={error} reset={() => {}} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
