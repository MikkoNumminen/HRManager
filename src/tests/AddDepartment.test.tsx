import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddDepartmentForm from "../components/AddDepartment";
import { createDepartment } from "../serverActions";

jest.mock("../serverActions", () => ({
  createDepartment: jest.fn(),
}));

describe("AddDepartment Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Shows the form title.
  test("renders the form title", () => {
    render(<AddDepartmentForm />);
    expect(screen.getByText("Add Department")).toBeInTheDocument();
  });

  // Submit button is disabled when name is empty.
  test("submit button is disabled when name is empty", () => {
    render(<AddDepartmentForm />);
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  // Submit button is enabled when name is filled.
  test("submit button is enabled when name is filled", () => {
    render(<AddDepartmentForm />);
    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Engineering" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled();
  });

  // Submit button is disabled when name is only whitespace.
  test("submit button is disabled for whitespace-only name", () => {
    render(<AddDepartmentForm />);
    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  // Description field is present and optional.
  test("renders optional description field", () => {
    render(<AddDepartmentForm />);
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  // Submits the form and calls createDepartment.
  test("submits the form and calls createDepartment", async () => {
    (createDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<AddDepartmentForm />);

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(createDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when createDepartment fails.
  test("shows error message when createDepartment fails", async () => {
    (createDepartment as jest.Mock).mockRejectedValue(new Error("Name already in use"));
    render(<AddDepartmentForm />);

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("Name already in use")).toBeInTheDocument();
    });
  });

  // Shows generic error message when createDepartment throws a non-Error value.
  test("shows generic error when createDepartment throws non-Error", async () => {
    (createDepartment as jest.Mock).mockRejectedValue("string error");
    render(<AddDepartmentForm />);

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });

  // Shows success snackbar after creating a department
  test("shows success snackbar after creating a department", async () => {
    const showSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    showSnackbar.mockClear();
    (createDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<AddDepartmentForm />);

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(showSnackbar).toHaveBeenCalledWith("Department created successfully");
    });
  });

  // Clears form fields after successful submission.
  test("clears fields after successful submission", async () => {
    (createDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<AddDepartmentForm />);

    const nameInput = screen.getByLabelText(/Enter Department Name/i);
    const descInput = screen.getByLabelText(/Description/i);

    fireEvent.change(nameInput, { target: { value: "Engineering" } });
    fireEvent.change(descInput, { target: { value: "Dev team" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
      expect(descInput).toHaveValue("");
    });
  });
});
