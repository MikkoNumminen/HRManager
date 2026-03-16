import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdatePositionForm from "../components/UpdatePosition";
import { updatePosition } from "../serverActions";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  updatePosition: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("UpdatePosition Component", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submit button is disabled when position is empty", () => {
    render(<UpdatePositionForm personID={personID} />);
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  test("submit button is disabled when position is only whitespace", () => {
    render(<UpdatePositionForm personID={personID} />);
    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  test("submit button is enabled when position has content", () => {
    render(<UpdatePositionForm personID={personID} />);
    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).not.toBeDisabled();
  });

  test("should submit the form and call updatePosition", async () => {
    const mockedUpdatePosition = updatePosition as jest.MockedFunction<typeof updatePosition>;
    render(<UpdatePositionForm personID={personID} />);

    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(mockedUpdatePosition).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  test("shows error message when updatePosition fails", async () => {
    (updatePosition as jest.MockedFunction<typeof updatePosition>).mockRejectedValue(
      new Error("Update failed")
    );
    render(<UpdatePositionForm personID={personID} />);

    fireEvent.change(screen.getByLabelText(/Enter New Position/i), {
      target: { value: "Senior Developer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("Update failed")).toBeInTheDocument();
    });
  });

  test("should handle form input change", () => {
    render(<UpdatePositionForm personID={personID} />);
    const positionInput = screen.getByLabelText(/Enter New Position/i) as HTMLInputElement;
    fireEvent.change(positionInput, { target: { value: "Lead Developer" } });
    expect(positionInput.value).toBe("Lead Developer");
  });
});
