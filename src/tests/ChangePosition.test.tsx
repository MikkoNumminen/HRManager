import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdatePositionForm from "../components/UpdatePosition";
import { updatePosition } from "../serverActions";
import { useRouter } from "next/navigation";

jest.mock("../serverActions", () => ({
  updatePosition: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPositions = [
  { id: "p1", name: "Developer", createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  { id: "p2", name: "Manager", createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
];

describe("UpdatePosition Component", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Submit button is disabled when no position entered.
  test("submit button is disabled when position is empty", () => {
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button is disabled when position is whitespace only.
  test("submit button is disabled when position is only whitespace", () => {
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);
    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button enables when a valid position is typed.
  test("submit button is enabled when position has content", () => {
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);
    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeEnabled();
  });

  // Form submission calls updatePosition server action.
  test("should submit the form and call updatePosition", async () => {
    const mockedUpdatePosition = updatePosition as jest.MockedFunction<typeof updatePosition>;
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);

    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(mockedUpdatePosition).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // Shows generic error message when updatePosition throws a non-Error value.
  test("shows generic error when updatePosition throws non-Error", async () => {
    (updatePosition as jest.MockedFunction<typeof updatePosition>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);

    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Shows specific error message from server.
  test("shows error message when updatePosition fails", async () => {
    (updatePosition as jest.MockedFunction<typeof updatePosition>).mockResolvedValue({
      error: "Update failed",
    });
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);

    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  // Input change is reflected in the controlled text field.
  test("should handle form input change", () => {
    render(<UpdatePositionForm personID={personID} positions={mockPositions} />);
    const positionInput = screen.getByLabelText(/Enter New Position/i) as HTMLInputElement;
    fireEvent.change(positionInput, { target: { value: "Lead Developer" } });
    expect(positionInput.value).toBe("Lead Developer");
  });
});
