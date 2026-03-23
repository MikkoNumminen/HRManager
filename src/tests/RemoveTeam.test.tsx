import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoveTeamForm from "../components/RemoveTeam";
import { removeTeam } from "../serverActions";

jest.mock("../serverActions", () => ({
  removeTeam: jest.fn(),
}));

describe("RemoveTeam Component", () => {
  const teamID = "team-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("remove button is enabled", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    expect(screen.getByRole("button", { name: /Remove/i })).not.toBeDisabled();
  });

  test("opens confirmation dialog when remove is clicked", async () => {
    render(<RemoveTeamForm teamID={teamID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this team/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveTeamForm teamID={teamID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to remove this team/),
      ).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    const mockedRemoveTeam = removeTeam as jest.MockedFunction<typeof removeTeam>;
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(mockedRemoveTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows generic error message when removeTeam throws a non-Error value.
  test("shows generic error when removeTeam throws non-Error", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when removeTeam fails", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockResolvedValue({
      error: "Removal failed",
    });
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});
