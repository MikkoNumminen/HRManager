import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  test("submit button is enabled when name is filled", async () => {
    render(<AddDepartmentForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "Engineering");
    expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled();
  });

  // Submit button is disabled when name is only whitespace.
  test("submit button is disabled for whitespace-only name", async () => {
    render(<AddDepartmentForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "   ");
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

    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(createDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when createDepartment fails.
  test("shows error message when createDepartment fails", async () => {
    (createDepartment as jest.Mock).mockResolvedValue({ error: "Name already in use" });
    render(<AddDepartmentForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("Name already in use")).toBeInTheDocument();
    });
  });

  // Shows generic error message when createDepartment throws a non-Error value.
  test("shows generic error when createDepartment throws non-Error", async () => {
    (createDepartment as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<AddDepartmentForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Shows success snackbar after creating a department
  test("shows success snackbar after creating a department", async () => {
    const showSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    showSnackbar.mockClear();
    (createDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<AddDepartmentForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Department Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Department Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

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

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Engineering");
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "Dev team");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(nameInput).toHaveValue("");
      expect(descInput).toHaveValue("");
    });
  });
});
