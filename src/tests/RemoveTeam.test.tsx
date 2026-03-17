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

  test("submit button is enabled", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    expect(screen.getByRole("button", { name: /Remove/i })).not.toBeDisabled();
  });

  test("submits the form and calls removeTeam", async () => {
    const mockedRemoveTeam = removeTeam as jest.MockedFunction<typeof removeTeam>;
    render(<RemoveTeamForm teamID={teamID} />);

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(mockedRemoveTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when removeTeam fails", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockRejectedValue(
      new Error("Removal failed")
    );
    render(<RemoveTeamForm teamID={teamID} />);

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });

  test("does not show Cancel button", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});
