import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateEmailForm from "@/features/persons/components/UpdateEmailForm";
import { updateEmail } from "@/features/persons/actions";
import { useRouter } from "next/navigation";

jest.mock("@/features/persons/actions", () => ({
  updateEmail: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Update Email", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submit button is disabled when email is empty", () => {
    render(<UpdateEmailForm personID={personID} />);
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  test("submit button is disabled when email format is invalid", () => {
    render(<UpdateEmailForm personID={personID} />);
    fireEvent.change(screen.getByLabelText(/Enter New Email/i), {
      target: { value: "notanemail" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  test("submit button is enabled when email format is valid", () => {
    render(<UpdateEmailForm personID={personID} />);
    fireEvent.change(screen.getByLabelText(/Enter New Email/i), {
      target: { value: "valid@example.com" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeEnabled();
  });

  test("should submit the form and call updateEmail", async () => {
    const mockedUpdateEmail = updateEmail as jest.MockedFunction<typeof updateEmail>;
    render(<UpdateEmailForm personID={personID} />);

    fireEvent.change(screen.getByLabelText(/Enter New Email/i), {
      target: { value: "new.email@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(mockedUpdateEmail).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // Shows generic error message when updateEmail throws a non-Error value.
  test("shows generic error when updateEmail throws non-Error", async () => {
    (updateEmail as jest.MockedFunction<typeof updateEmail>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<UpdateEmailForm personID={personID} />);

    fireEvent.change(screen.getByLabelText(/Enter New Email/i), {
      target: { value: "taken@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when updateEmail fails", async () => {
    (updateEmail as jest.MockedFunction<typeof updateEmail>).mockResolvedValue({
      error: "A person with this email already exists",
    });
    render(<UpdateEmailForm personID={personID} />);

    fireEvent.change(screen.getByLabelText(/Enter New Email/i), {
      target: { value: "taken@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("A person with this email already exists")).toBeInTheDocument();
    });
  });

  test("should handle form input change", () => {
    render(<UpdateEmailForm personID={personID} />);
    const emailInput = screen.getByLabelText(/Enter New Email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "updated.email@example.com" } });
    expect(emailInput.value).toBe("updated.email@example.com");
  });
});
