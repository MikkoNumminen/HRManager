import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddTeamForm from "../components/AddTeam";
import { createTeam } from "@/features/teams/actions";

jest.mock("@/features/teams/actions", () => ({
  createTeam: jest.fn(),
}));

describe("AddTeam Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submit button is disabled when name is empty", () => {
    render(<AddTeamForm />);
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is enabled when name is filled", async () => {
    render(<AddTeamForm />);
    await userEvent.clear(screen.getByLabelText(/Enter Team Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Team Name/i), "Engineering");
    expect(screen.getByRole("button", { name: /Create/i })).toBeEnabled();
  });

  test("submits the form and calls createTeam", async () => {
    const mockedCreateTeam = createTeam as jest.MockedFunction<typeof createTeam>;
    render(<AddTeamForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Team Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Team Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(mockedCreateTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("clears the form after successful submit", async () => {
    (createTeam as jest.MockedFunction<typeof createTeam>).mockResolvedValue(undefined);
    render(<AddTeamForm />);

    const input = screen.getByLabelText(/Enter Team Name/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe("");
    });
  });

  // Shows success snackbar after creating a team
  test("shows success snackbar after creating a team", async () => {
    const showSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    showSnackbar.mockClear();
    (createTeam as jest.MockedFunction<typeof createTeam>).mockResolvedValue(undefined);
    render(<AddTeamForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Team Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Team Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(showSnackbar).toHaveBeenCalledWith("Team created successfully");
    });
  });

  // Shows generic error message when createTeam throws a non-Error value.
  test("shows generic error when createTeam throws non-Error", async () => {
    (createTeam as jest.MockedFunction<typeof createTeam>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<AddTeamForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Team Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Team Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when createTeam fails", async () => {
    (createTeam as jest.MockedFunction<typeof createTeam>).mockResolvedValue({
      error: "Team already exists",
    });
    render(<AddTeamForm />);

    await userEvent.clear(screen.getByLabelText(/Enter Team Name/i));
    await userEvent.type(screen.getByLabelText(/Enter Team Name/i), "Engineering");
    await userEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("Team already exists")).toBeInTheDocument();
    });
  });
});
