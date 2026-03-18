import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetAll from "../components/ResetAll";
import { resetAll, seedMockData } from "../serverActions";
import { Permissions } from "../schemas";

jest.mock("../serverActions", () => ({
  resetAll: jest.fn(),
  seedMockData: jest.fn(),
}));

const allPermissions: Permissions = {
  "data:reset": true,
  "data:seed": true,
};

const resetOnlyPermissions: Permissions = {
  "data:reset": true,
  "data:seed": false,
};

const seedOnlyPermissions: Permissions = {
  "data:reset": false,
  "data:seed": true,
};

describe("ResetAll Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Checks that the box has the right heading
  test("renders the Developer Tools heading", () => {
    render(<ResetAll permissions={allPermissions} />);
    expect(screen.getByText("Developer Tools")).toBeInTheDocument();
  });

  // Checks that the reset button is there when user has data:reset permission
  test("renders the Reset All Data button", () => {
    render(<ResetAll permissions={allPermissions} />);
    expect(screen.getByRole("button", { name: /Reset All Data/i })).toBeInTheDocument();
  });

  // Checks that the seed button is there when user has data:seed permission
  test("renders the Load Mock Data button", () => {
    render(<ResetAll permissions={allPermissions} />);
    expect(screen.getByRole("button", { name: /Load Mock Data/i })).toBeInTheDocument();
  });

  // Clicking the reset button should open a "are you sure?" dialog
  test("opens confirmation dialog when Reset All Data is clicked", () => {
    render(<ResetAll permissions={allPermissions} />);
    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    expect(
      screen.getByText(/Are you sure you want to delete all persons and teams/),
    ).toBeInTheDocument();
  });

  // Clicking cancel should close the reset dialog without doing anything
  test("closes reset dialog when cancel is clicked", async () => {
    render(<ResetAll permissions={allPermissions} />);
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
    render(<ResetAll permissions={allPermissions} />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(resetAll).toHaveBeenCalled();
    });
  });

  // If resetAll throws an error, it should show the error message on screen
  test("shows error message when resetAll fails", async () => {
    (resetAll as jest.Mock).mockRejectedValue(new Error("Reset failed"));
    render(<ResetAll permissions={allPermissions} />);

    fireEvent.click(screen.getByRole("button", { name: /Reset All Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset All/i }));

    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
  });

  // Clicking Load Mock Data should open a dialog asking about existing data
  test("opens seed dialog when Load Mock Data is clicked", () => {
    render(<ResetAll permissions={allPermissions} />);
    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    expect(
      screen.getByText(/Do you want to keep your existing data or replace it/),
    ).toBeInTheDocument();
  });

  // The seed dialog should have Cancel, Keep Existing, and Replace All buttons
  test("seed dialog has three action buttons", () => {
    render(<ResetAll permissions={allPermissions} />);
    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keep Existing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replace All/i })).toBeInTheDocument();
  });

  // Clicking cancel should close the seed dialog without doing anything
  test("closes seed dialog when cancel is clicked", async () => {
    render(<ResetAll permissions={allPermissions} />);
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
    render(<ResetAll permissions={allPermissions} />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Keep Existing/i }));

    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(false);
    });
  });

  // Clicking "Replace All" should call seedMockData with true (clear first)
  test("calls seedMockData with true when Replace All is clicked", async () => {
    (seedMockData as jest.Mock).mockResolvedValue(undefined);
    render(<ResetAll permissions={allPermissions} />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Replace All/i }));

    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(true);
    });
  });

  // If seedMockData throws an error, it should show the error message on screen
  test("shows error message when seedMockData fails", async () => {
    (seedMockData as jest.Mock).mockRejectedValue(new Error("Seed failed"));
    render(<ResetAll permissions={allPermissions} />);

    fireEvent.click(screen.getByRole("button", { name: /Load Mock Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /Replace All/i }));

    await waitFor(() => {
      expect(screen.getByText("Seed failed")).toBeInTheDocument();
    });
  });

  // If user only has data:reset, the seed button should not be visible
  test("hides Load Mock Data button when user lacks data:seed permission", () => {
    render(<ResetAll permissions={resetOnlyPermissions} />);
    expect(screen.queryByRole("button", { name: /Load Mock Data/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset All Data/i })).toBeInTheDocument();
  });

  // If user only has data:seed, the reset button should not be visible
  test("hides Reset All Data button when user lacks data:reset permission", () => {
    render(<ResetAll permissions={seedOnlyPermissions} />);
    expect(screen.queryByRole("button", { name: /Reset All Data/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Load Mock Data/i })).toBeInTheDocument();
  });
});
