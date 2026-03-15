import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTeamForm from "../components/AddTeam";
import { createTeam } from "../serverActions";

jest.mock("../serverActions", () => ({
  createTeam: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddTeam Component", () => {
  test("submits the form and calls createTeam", async () => {
    const mockedCreateTeam = createTeam as jest.MockedFunction<typeof createTeam>;

    render(<AddTeamForm />);

    const nameInput = screen.getByPlaceholderText("Enter Team Name");
    fireEvent.change(nameInput, { target: { value: "Engineering" } });

    const submitButton = screen.getByRole("button", { name: /Create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedCreateTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });
});
