/*
ded a test to verify button click handling in RemovePersonForm component.
- Ensured that the button is enabled after rendering and clicking it.
- Updated tests to check correct behavior of removePerson function and routing.
*/

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemovePersonForm from "../components/RemovePerson";
import { removePerson } from "../serverActions";
import { useRouter } from "next/navigation";
import '@testing-library/jest-dom';

// Mock the removePerson function
jest.mock("../serverActions", () => ({
  removePerson: jest.fn(),
}));

// Mock useRouter hook from next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Remove People", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    // Mock useRouter to provide the mockPush function
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submits the form and calls removePerson", async () => {
    const mockedRemovePerson = removePerson as jest.MockedFunction<typeof removePerson>;

    render(<RemovePersonForm personID={personID} />);

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(submitButton);

    // Wait for removePerson to be called
    await waitFor(() => {
      expect(mockedRemovePerson).toHaveBeenCalledWith(expect.any(FormData));
    });

    // Verify that router.push was called to navigate to the new route
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  test("should handle button click", () => {
    render(<RemovePersonForm personID={personID} />);

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /Remove/i });
    userEvent.click(submitButton);

    // Verify that the button is enabled (it should not be disabled)
    expect(submitButton).not.toBeDisabled();
  });
});
