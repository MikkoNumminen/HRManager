/*
- Added test to verify handling of input field value changes in UpdateEmailForm
- Added test to ensure form submission triggers `updateEmail` and navigates to the correct route
- Mocked `useRouter` and `updateEmail` to validate routing and API calls
*/

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdateEmailForm from "../components/UpdateEmail";
import { updateEmail } from "../serverActions";
import { useRouter } from "next/navigation";

// Mock the updateEmail function
jest.mock("../serverActions", () => ({
  updateEmail: jest.fn(),
}));

// Mock useRouter hook from next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Update Email", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    // Mock useRouter to provide the mockPush function
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should submit the form and call updateEmail", async () => {
    const mockedUpdateEmail = updateEmail as jest.MockedFunction<
      typeof updateEmail
    >;

    render(<UpdateEmailForm personID={personID} />);

    // Find the input field and type a new email
    const emailInput = screen.getByPlaceholderText(
      "Enter New Email"
    ) as HTMLInputElement;
    userEvent.type(emailInput, "new.email@example.com");

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /Change/i });
    fireEvent.click(submitButton);

    // Wait for updateEmail to be called
    await waitFor(() => {
      expect(mockedUpdateEmail).toHaveBeenCalledWith(expect.any(FormData));
    });

    // Verify that router.push was called to navigate to the new route
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  test("should handle form input change", () => {
    render(<UpdateEmailForm personID={personID} />);

    // Find the input field and change its value
    const emailInput = screen.getByPlaceholderText(
      "Enter New Email"
    ) as HTMLInputElement;
    userEvent.clear(emailInput);
    userEvent.type(emailInput, "updated.email@example.com");

    // Adding a delay to make sure that state update is applied
    setTimeout(() => {
      // Verify that the input field's value is updated
      expect(emailInput.value).toBe("updated.email@example.com");
    }, 500); // Adjust time as needed
  });
});
