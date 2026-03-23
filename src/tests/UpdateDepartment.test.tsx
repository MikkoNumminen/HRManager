import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateDepartmentForm from "../components/UpdateDepartment";
import { updateDepartment } from "../serverActions";

jest.mock("../serverActions", () => ({
  updateDepartment: jest.fn(),
}));

describe("UpdateDepartment Component", () => {
  const departmentID = "dept-1";
  const currentName = "Engineering";
  const currentDescription = "The engineering department";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    expect(screen.getByText("Edit Department")).toBeInTheDocument();
  });

  // The text fields show the current name and description.
  test("shows current name and description in text fields", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    const nameInput = screen.getByLabelText(/Enter Department Name/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Description/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Engineering");
    expect(descInput.value).toBe("The engineering department");
  });

  // Submit button is disabled when nothing has changed.
  test("submit button is disabled when nothing changed", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  // Submit button is disabled when name is empty (even if description changed).
  test("submit button is disabled when name is empty", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "" },
    });
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  // Submit button is disabled when name is only whitespace.
  test("submit button is disabled when name is only whitespace", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  // Submit button is enabled when the name is changed.
  test("submit button is enabled when name is changed", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Product" },
    });
    expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled();
  });

  // Submit button is enabled when only the description is changed.
  test("submit button is enabled when description is changed", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Updated description" },
    });
    expect(screen.getByRole("button", { name: /Save/i })).toBeEnabled();
  });

  // Submits the form and calls updateDepartment.
  test("submits the form and calls updateDepartment", async () => {
    (updateDepartment as jest.Mock).mockResolvedValue(undefined);
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(updateDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when updateDepartment fails with an Error.
  test("shows error message when updateDepartment fails", async () => {
    (updateDepartment as jest.Mock).mockResolvedValue({ error: "Update failed" });
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when updateDepartment throws a non-Error value.
  test("shows generic error when updateDepartment throws non-Error", async () => {
    (updateDepartment as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "Product" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Hidden input contains the department ID.
  test("includes departmentID as hidden input", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    const input = document.querySelector('input[name="departmentID"]') as HTMLInputElement;
    expect(input.value).toBe(departmentID);
  });

  // Handles null description gracefully (treats it as empty string).
  test("handles null description", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={null}
      />,
    );
    const descInput = screen.getByLabelText(/Description/i) as HTMLInputElement;
    expect(descInput.value).toBe("");
  });

  // Handles input changes for both name and description.
  test("handles form input changes", () => {
    render(
      <UpdateDepartmentForm
        departmentID={departmentID}
        currentName={currentName}
        currentDescription={currentDescription}
      />,
    );
    const nameInput = screen.getByLabelText(/Enter Department Name/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Description/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "Product" } });
    fireEvent.change(descInput, { target: { value: "New description" } });

    expect(nameInput.value).toBe("Product");
    expect(descInput.value).toBe("New description");
  });
});
