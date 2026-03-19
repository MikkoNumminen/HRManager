import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemoveDepartmentForm from "../components/RemoveDepartment";
import { removeDepartment } from "../serverActions";

jest.mock("../serverActions", () => ({
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
    expect(screen.getByRole("button", { name: /Remove/i })).not.toBeDisabled();
  });

  // Opens confirmation dialog when remove is clicked.
  test("opens confirmation dialog when remove is clicked", () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this department/)).toBeInTheDocument();
  });

  // Closes dialog when cancel is clicked.
  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
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

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(removeDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when removeDepartment fails.
  test("shows error message when removeDepartment fails", async () => {
    (removeDepartment as jest.Mock).mockRejectedValue(new Error("Removal failed"));
    render(<RemoveDepartmentForm departmentID={departmentID} />);

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });

  // The hidden input contains the department ID.
  test("includes departmentID as hidden input", () => {
    render(<RemoveDepartmentForm departmentID={departmentID} />);
    const hiddenInput = document.querySelector('input[name="departmentID"]') as HTMLInputElement;
    expect(hiddenInput).toBeTruthy();
    expect(hiddenInput.value).toBe(departmentID);
  });
});
