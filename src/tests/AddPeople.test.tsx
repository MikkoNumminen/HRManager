import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  test("should have a disabled submit button when fields are empty", () => {
    render(<AddPersonForm />);

    const submitButton = screen.getByRole("button", { name: /Create/i });
    expect(submitButton).toBeDisabled();
  });

  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<
      typeof createPerson
    >;

    render(<AddPersonForm />);

    const nameInput = screen.getByPlaceholderText("Enter Name");
    fireEvent.change(nameInput, { target: { value: "John Doe" } });

    const emailInput = screen.getByPlaceholderText("Enter Email");
    fireEvent.change(emailInput, { target: { value: "john.doe@example.com" } });

    const submitButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
  });
});
