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
import "@testing-library/jest-dom";

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
  test("should have an enabled submit button", () => {
    render(<AddPersonForm />);

    const submitButton = screen.getByRole("button", { name: /Create/i });
    expect(submitButton).not.toBeDisabled();
  });

  test("submits the form and calls createPerson", async () => {
    const mockedCreatePerson = createPerson as jest.MockedFunction<
      typeof createPerson
    >;

    render(<AddPersonForm />);

    const nameInput = screen.getByPlaceholderText("Enter Name");
    userEvent.type(nameInput, "John Doe");

    const emailInput = screen.getByPlaceholderText("Enter Email");
    userEvent.type(emailInput, "john.doe@example.com");

    const submitButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedCreatePerson).toHaveBeenCalledWith(expect.any(FormData));
    });

    expect(mockReload).toHaveBeenCalled();
  });
});
