import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoveDepartmentForm from "@/features/departments/components/RemoveDepartmentForm";
import { removeDepartment } from "@/features/departments/actions";

jest.mock("@/features/departments/actions", () => ({
  removeDepartment: jest.fn(),
}));

describe("RemoveDepartment Component", () => {
  const departmentID = "dept-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    expect(screen.getByText("Remove Department")).toBeInTheDocument();
  });

  // Remove button is enabled.
  test("remove button is enabled", () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    expect(screen.getByRole("button", { name: /Remove/i })).toBeEnabled();
  });

  // Opens confirmation dialog when remove is clicked.
  test("opens confirmation dialog when remove is clicked", async () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this department/)).toBeInTheDocument();
  });

  // Closes dialog when cancel is clicked.
  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to remove this department/),
      ).not.toBeInTheDocument();
    });
  });

  // Submits the form after confirming dialog.
  test("submits the form after confirming dialog", async () => {
    (removeDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<RemoveDepartmentForm departmentID={departmentID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(removeDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when removeDepartment fails.
  test("shows error message when removeDepartment fails", async () => {
    (removeDepartment as jest.Mock).mockResolvedValue({ error: "Removal failed" });
    render(<RemoveDepartmentForm departmentID={departmentID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when removeDepartment throws a non-Error value.
  test("shows generic error when removeDepartment throws non-Error", async () => {
    (removeDepartment as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<RemoveDepartmentForm departmentID={departmentID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // The hidden input contains the department ID.
  test("includes departmentID as hidden input", () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    expect(screen.getByDisplayValue(departmentID)).toHaveAttribute("name", "departmentID");
  });
});

describe("RemoveDepartmentForm – impact branches", () => {
  const getDialog = () => {
    const dialog = document.querySelector("[role='dialog']");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { within } = require("@testing-library/react");
    return within(dialog as HTMLElement);
  };

  // No impact prop renders no affected references.
  test("no impact prop renders no affected references", async () => {
    render(<RemoveDepartmentForm departmentID="d1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });

  // Empty teams array renders no affected references.
  test("impact with empty teams", async () => {
    render(<RemoveDepartmentForm departmentID="d1" impact={{ teams: [] }} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });

  // Teams with names shows team names in dialog.
  test("impact with teams shows team names", async () => {
    render(
      <RemoveDepartmentForm
        departmentID="d1"
        impact={{ teams: [{ teamName: "Alpha" }, { teamName: "Beta" }] }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Alpha, Beta/)).toBeInTheDocument();
  });
});
