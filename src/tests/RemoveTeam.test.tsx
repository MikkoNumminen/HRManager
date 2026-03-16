import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemoveTeamForm from "../components/RemoveTeam";
import { removeTeam } from "../serverActions";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  removeTeam: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("RemoveTeam Component", () => {
  const mockPush = jest.fn();
  const teamID = "team-123";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

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
    expect(mockPush).toHaveBeenCalledWith("/manageTeams");
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

  test("shows Cancel button by default", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("hides Cancel button when showCancel is false", () => {
    render(<RemoveTeamForm teamID={teamID} showCancel={false} />);
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});
