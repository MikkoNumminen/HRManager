import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetAll from "../components/ResetAll";
import { resetAll } from "../serverActions";

jest.mock("../serverActions", () => ({
  resetAll: jest.fn(),
}));

describe("ResetAll Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the Reset heading", () => {
    render(<ResetAll />);
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  test("renders the Reset All Data button", () => {
    render(<ResetAll />);
    expect(screen.getByRole("button", { name: /Reset All Data/i })).toBeInTheDocument();
  });

  test("calls resetAll when button is clicked", async () => {
    (resetAll as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));

    await waitFor(() => {
      expect(resetAll).toHaveBeenCalled();
    });
  });

  test("shows error message when resetAll fails", async () => {
    (resetAll as jest.Mock).mockRejectedValue(new Error("Reset failed"));
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));

    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
  });
});
