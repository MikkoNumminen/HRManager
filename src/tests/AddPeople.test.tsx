import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddPersonForm from "../components/AddPeople";
import { createPerson } from "../serverActions";

jest.mock("../serverActions", () => ({
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

  test("submit button is disabled when only name is filled", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "John" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is disabled when email is invalid format", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/Enter Email/i), {
      target: { value: "notanemail" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is enabled when name and valid email are filled", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/Enter Email/i), {
      target: { value: "john@example.com" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled();
  });

  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<typeof createPerson>;
    render(<AddPersonForm />);

    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Enter Email/i), {
      target: { value: "john.doe@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("clears the form after successful submit", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue(undefined);
    render(<AddPersonForm />);

    const nameInput = screen.getByLabelText(/Enter Name/i);
    const emailInput = screen.getByLabelText(/Enter Email/i);
    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe("");
    });
    expect((emailInput as HTMLInputElement).value).toBe("");
  });

  test("shows error message when createPerson fails", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockRejectedValue(
      new Error("A person with this email already exists"),
    );
    render(<AddPersonForm />);

    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Enter Email/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("A person with this email already exists")).toBeInTheDocument();
    });
  });
});
