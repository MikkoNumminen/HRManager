import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  test("opens confirmation dialog when remove is clicked", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this team/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveTeamForm teamID={teamID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to remove this team/),
      ).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    const mockedRemoveTeam = removeTeam as jest.MockedFunction<typeof removeTeam>;
    render(<RemoveTeamForm teamID={teamID} />);

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(mockedRemoveTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when removeTeam fails", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockRejectedValue(
      new Error("Removal failed"),
    );
    render(<RemoveTeamForm teamID={teamID} />);

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});
