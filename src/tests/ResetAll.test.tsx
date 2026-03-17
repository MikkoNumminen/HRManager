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

  test("opens confirmation dialog when button is clicked", () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    expect(
      screen.getByText(/Are you sure you want to delete all persons and teams/),
    ).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to delete all persons and teams/),
      ).not.toBeInTheDocument();
    });
  });

  test("calls resetAll after confirming dialog", async () => {
    (resetAll as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(resetAll).toHaveBeenCalled();
    });
  });

  test("shows error message when resetAll fails", async () => {
    (resetAll as jest.Mock).mockRejectedValue(new Error("Reset failed"));
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
  });
});
