import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetAll from "../components/ResetAll";
import { resetAll, seedMockData } from "../serverActions";

jest.mock("../serverActions", () => ({
  resetAll: jest.fn(),
  seedMockData: jest.fn(),
}));

describe("ResetAll Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Checks that the box has the right heading
  test("renders the Developer Tools heading", () => {
    render(<ResetAll />);
    expect(screen.getByText("Developer Tools")).toBeInTheDocument();
  });

  // Checks that the reset button is there
  test("renders the Reset All Data button", () => {
    render(<ResetAll />);
    expect(screen.getByRole("button", { name: /Reset All Data/i })).toBeInTheDocument();
  });

  // Checks that the seed button is there
  test("renders the Load Mock Data button", () => {
    render(<ResetAll />);
    expect(screen.getByRole("button", { name: /Load Mock Data/i })).toBeInTheDocument();
  });

  // Clicking the reset button should open a "are you sure?" dialog
  test("opens confirmation dialog when Reset All Data is clicked", () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    expect(
      screen.getByText(/Are you sure you want to delete all persons and teams/),
    ).toBeInTheDocument();
  });

  // Clicking cancel should close the reset dialog without doing anything
  test("closes reset dialog when cancel is clicked", async () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to delete all persons and teams/),
      ).not.toBeInTheDocument();
    });
  });

  // Confirming the reset dialog should actually call the resetAll server action
  test("calls resetAll after confirming dialog", async () => {
    (resetAll as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(resetAll).toHaveBeenCalled();
    });
  });

  // If resetAll throws an error, it should show the error message on screen
  test("shows error message when resetAll fails", async () => {
    (resetAll as jest.Mock).mockRejectedValue(new Error("Reset failed"));
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
  });

  // Clicking Load Mock Data should open a dialog asking about existing data
  test("opens seed dialog when Load Mock Data is clicked", () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    expect(
      screen.getByText(/Do you want to keep your existing data or replace it/),
    ).toBeInTheDocument();
  });

  // The seed dialog should have Cancel, Keep Existing, and Replace All buttons
  test("seed dialog has three action buttons", () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keep Existing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replace All/i })).toBeInTheDocument();
  });

  // Clicking cancel should close the seed dialog without doing anything
  test("closes seed dialog when cancel is clicked", async () => {
    render(<ResetAll />);
    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Do you want to keep your existing data or replace it/),
      ).not.toBeInTheDocument();
    });
  });

  // Clicking "Keep Existing" should call seedMockData with false (don't clear)
  test("calls seedMockData with false when Keep Existing is clicked", async () => {
    (seedMockData as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Keep Existing/i }));

    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(false);
    });
  });

  // Clicking "Replace All" should call seedMockData with true (clear first)
  test("calls seedMockData with true when Replace All is clicked", async () => {
    (seedMockData as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Replace All/i }));

    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(true);
    });
  });

  // If seedMockData throws an error, it should show the error message on screen
  test("shows error message when seedMockData fails", async () => {
    (seedMockData as jest.Mock).mockRejectedValue(new Error("Seed failed"));
    render(<ResetAll />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Replace All/i }));

    await waitFor(() => {
      expect(screen.getByText("Seed failed")).toBeInTheDocument();
    });
  });
});
