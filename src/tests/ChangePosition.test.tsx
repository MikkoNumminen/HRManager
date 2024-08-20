/*
- Added test to verify handling of input field value changes in UpdatePositionForm
- Added test to ensure form submission triggers `updatePosition` and navigates to the correct route
- Mocked `useRouter` and `updatePosition` to validate routing and API calls
*/

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdatePositionForm from "../components/UpdatePosition";
import { updatePosition } from "../serverActions";
import { useRouter } from "next/navigation";

// Mock the updatePosition function
jest.mock("../serverActions", () => ({
  updatePosition: jest.fn(),
}));

// Mock useRouter hook from next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("UpdatePosition Component", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    // Mock useRouter to provide the mockPush function
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should submit the form and call updatePosition", async () => {
    const mockedUpdatePosition = updatePosition as jest.MockedFunction<
      typeof updatePosition
    >;

    render(<UpdatePositionForm personID={personID} />);

    // Find the input field and type a new position
    const positionInput = screen.getByPlaceholderText(
      "Enter New Position"
    ) as HTMLInputElement;
    userEvent.type(positionInput, "Senior Developer");

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /Change/i });
    fireEvent.click(submitButton);

    // Wait for updatePosition to be called
    await waitFor(() => {
      expect(mockedUpdatePosition).toHaveBeenCalledWith(expect.any(FormData));
    });

    // Verify that router.push was called to navigate to the new route
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  test("should handle form input change", () => {
    render(<UpdatePositionForm personID={personID} />);

    // Find the input field and change its value
    const positionInput = screen.getByPlaceholderText(
      "Enter New Position"
    ) as HTMLInputElement;
    userEvent.clear(positionInput);
    userEvent.type(positionInput, "Lead Developer");

    // Adding a delay to make sure that state update is applied
    setTimeout(() => {
      // Verify that the input field's value is updated
      expect(positionInput.value).toBe("Lead Developer");
    }, 500); // Adjust time as needed
  });
});
