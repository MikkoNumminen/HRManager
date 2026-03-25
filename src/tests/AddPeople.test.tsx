import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddPersonForm from "@/features/persons/components/AddPersonForm";
import { createPerson } from "@/features/persons/actions";

jest.mock("@/features/persons/actions", () => ({
  createPerson: jest.fn(),
}));

describe("AddPerson Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submit button is disabled when fields are empty", () => {
    render(<AddPersonForm />);
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is disabled when only name is filled", async () => {
    render(<AddPersonForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John");
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is disabled when email is invalid format", async () => {
    render(<AddPersonForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "notanemail");
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is enabled when name and valid email are filled", async () => {
    render(<AddPersonForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "john@example.com");
    expect(screen.getByRole("button", { name: /Create/i })).toBeEnabled();
  });

  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<typeof createPerson>;
    render(<AddPersonForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John Doe");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "john.doe@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("clears the form after successful submit", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue(undefined);
    render(<AddPersonForm />);

    const nameInput = screen.getByLabelText(/Enter Name/i);
    const emailInput = screen.getByLabelText(/Enter Email/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "John Doe");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "john@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe("");
    });
    expect((emailInput as HTMLInputElement).value).toBe("");
  });

  // Shows generic error message when createPerson throws a non-Error value.
  test("shows generic error when createPerson throws non-Error", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<AddPersonForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John Doe");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "john@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Shows success snackbar after creating a person
  test("shows success snackbar after creating a person", async () => {
    const showSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    showSnackbar.mockClear();
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue(undefined);
    render(<AddPersonForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John Doe");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "john@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(showSnackbar).toHaveBeenCalledWith("Person created successfully");
    });
  });

  test("shows error message when createPerson fails", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue({
      error: "A person with this email already exists",
    });
    render(<AddPersonForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Name/i), "John Doe");
    await userEvent.clear(screen.getByLabelText(/Enter Email/i));
    await userEvent.type(screen.getByLabelText(/Enter Email/i), "john@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("A person with this email already exists")).toBeInTheDocument();
    });
  });
});
