import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddPersonForm from "../components/AddPeople";
import { createPerson } from "../serverActions";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  createPerson: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddPerson Component", () => {
  test("submit button is disabled when fields are empty", () => {
    render(<AddPersonForm />);
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is disabled when only name is filled", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByPlaceholderText("Enter Name"), {
      target: { value: "John" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is disabled when email is invalid format", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByPlaceholderText("Enter Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Email"), {
      target: { value: "notanemail" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is enabled when name and valid email are filled", () => {
    render(<AddPersonForm />);
    fireEvent.change(screen.getByPlaceholderText("Enter Name"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Email"), {
      target: { value: "john@example.com" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled();
  });

  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<typeof createPerson>;
    render(<AddPersonForm />);

    fireEvent.change(screen.getByPlaceholderText("Enter Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Email"), {
      target: { value: "john.doe@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("clears the form and calls onSuccess after successful submit", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<AddPersonForm onSuccess={onSuccess} />);

    const nameInput = screen.getByPlaceholderText("Enter Name");
    const emailInput = screen.getByPlaceholderText("Enter Email");
    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect((nameInput as HTMLInputElement).value).toBe("");
    expect((emailInput as HTMLInputElement).value).toBe("");
  });

  test("shows error message when createPerson fails", async () => {
    (createPerson as jest.MockedFunction<typeof createPerson>).mockRejectedValue(
      new Error("A person with this email already exists")
    );
    render(<AddPersonForm />);

    fireEvent.change(screen.getByPlaceholderText("Enter Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Email"), {
      target: { value: "john@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(
        screen.getByText("A person with this email already exists")
      ).toBeInTheDocument();
    });
  });
});
