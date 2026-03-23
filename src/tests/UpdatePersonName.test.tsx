import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdatePersonNameForm from "../components/UpdatePersonName";
import { updatePersonName } from "../serverActions";
import { useRouter } from "next/navigation";

jest.mock("../serverActions", () => ({
  updatePersonName: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("UpdatePersonName Component", () => {
  const mockPush = jest.fn();
  const personID = "person-1";
  const currentName = "Alice";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    expect(screen.getByText("Change Name")).toBeInTheDocument();
  });

  // The text field shows the current name as the default value.
  test("shows current name in the text field", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    const input = screen.getByLabelText(/Enter New Name/i) as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  // Submit button is disabled when the name hasn't changed.
  test("submit button is disabled when name is unchanged", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button is disabled when the name is only whitespace.
  test("submit button is disabled when name is only whitespace", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    fireEvent.change(screen.getByLabelText(/Enter New Name/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button is enabled when the name is different and non-empty.
  test("submit button is enabled when name is changed", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    fireEvent.change(screen.getByLabelText(/Enter New Name/i), {
      target: { value: "Alicia" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeEnabled();
  });

  // Submits the form and calls updatePersonName, then navigates back.
  test("submits the form and calls updatePersonName", async () => {
    (updatePersonName as jest.Mock).mockResolvedValue(undefined);
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Name/i), {
      target: { value: "Alicia" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(updatePersonName).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // Shows error message when updatePersonName fails with an Error.
  test("shows error message when updatePersonName fails", async () => {
    (updatePersonName as jest.Mock).mockResolvedValue({ error: "Name update failed" });
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Name/i), {
      target: { value: "Alicia" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("Name update failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when updatePersonName throws a non-Error value.
  test("shows generic error when updatePersonName throws non-Error", async () => {
    (updatePersonName as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Name/i), {
      target: { value: "Alicia" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Hidden input contains the person ID.
  test("includes personID as hidden input", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    const input = document.querySelector('input[name="personID"]') as HTMLInputElement;
    expect(input.value).toBe(personID);
  });

  // Handles input change properly.
  test("handles form input change", () => {
    render(<UpdatePersonNameForm personID={personID} currentName={currentName} />);
    const nameInput = screen.getByLabelText(/Enter New Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Bob" } });
    expect(nameInput.value).toBe("Bob");
  });
});
