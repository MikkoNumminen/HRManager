import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  test("submits the form and calls removeTeam", async () => {
    const mockedRemoveTeam = removeTeam as jest.MockedFunction<typeof removeTeam>;

    render(<RemoveTeamForm teamID={teamID} />);

    const submitButton = screen.getByRole("button", { name: /Remove/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedRemoveTeam).toHaveBeenCalledWith(expect.any(FormData));
    });

    expect(mockPush).toHaveBeenCalledWith("/manageTeams");
  });

  test("should handle button click", () => {
    render(<RemoveTeamForm teamID={teamID} />);

    const submitButton = screen.getByRole("button", { name: /Remove/i });
    userEvent.click(submitButton);

    expect(submitButton).not.toBeDisabled();
  });
});
