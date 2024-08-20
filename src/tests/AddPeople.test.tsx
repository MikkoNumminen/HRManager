/*
- Mocked `window.location.reload` to avoid JSDOM navigation errors in `AddPersonForm` tests
- Used `Object.defineProperty` to override `reload` due to TypeScript constraints
- Added a test to ensure form submission correctly triggers `createPerson` function
- Verified that the form's submit button calls `createPerson` and checks if `window.location.reload` is triggered
*/

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddPersonForm from "../components/AddPeople";
import { createPerson } from "../serverActions";

// Mock the createPerson function
jest.mock("../serverActions", () => ({
  createPerson: jest.fn(),
}));

let originalLocation: Location;
const mockReload = jest.fn();

beforeAll(() => {
  originalLocation = globalThis.location;

  // Mock the location.reload method
  Object.defineProperty(globalThis, "location", {
    value: {
      ...originalLocation,
      reload: mockReload,
    },
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore the original location object
  Object.defineProperty(globalThis, "location", {
    value: originalLocation,
    writable: true,
  });
});

describe("AddPerson Component", () => {
  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<
      typeof createPerson
    >;

    render(<AddPersonForm />);

    // Find the input field and type a name
    const nameInput = screen.getByPlaceholderText("Enter Name");
    userEvent.type(nameInput, "John Doe");

    // Find and click the submit button
    const submitButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(submitButton);

    // Wait for createPerson to be called
    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });

    // Verify that the form submission triggers reload (mocked)
    expect(mockReload).toHaveBeenCalled();
  });
});
