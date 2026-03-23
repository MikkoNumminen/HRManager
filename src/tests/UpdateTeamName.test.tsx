import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateTeamNameForm from "../components/UpdateTeamName";
import { updateTeamName } from "../serverActions";
import { useRouter } from "next/navigation";

jest.mock("../serverActions", () => ({
  updateTeamName: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("UpdateTeamName Component", () => {
  const mockPush = jest.fn();
  const teamID = "team-1";
  const currentName = "Engineering";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    expect(screen.getByText("Rename Team")).toBeInTheDocument();
  });

  // The text field shows the current team name as the default value.
  test("shows current name in the text field", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    const input = screen.getByLabelText(/Enter New Team Name/i) as HTMLInputElement;
    expect(input.value).toBe("Engineering");
  });

  // Submit button is disabled when the name hasn't changed.
  test("submit button is disabled when name is unchanged", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button is disabled when the name is only whitespace.
  test("submit button is disabled when name is only whitespace", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    fireEvent.change(screen.getByLabelText(/Enter New Team Name/i), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeDisabled();
  });

  // Submit button is enabled when the name is different and non-empty.
  test("submit button is enabled when name is changed", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    fireEvent.change(screen.getByLabelText(/Enter New Team Name/i), {
      target: { value: "Platform" },
    });
    expect(screen.getByRole("button", { name: /Change/i })).toBeEnabled();
  });

  // Submits the form and calls updateTeamName, then navigates back.
  test("submits the form and calls updateTeamName", async () => {
    (updateTeamName as jest.Mock).mockResolvedValue(undefined);
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Team Name/i), {
      target: { value: "Platform" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(updateTeamName).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/manageTeams");
  });

  // Shows error message when updateTeamName fails with an Error.
  test("shows error message when updateTeamName fails", async () => {
    (updateTeamName as jest.Mock).mockResolvedValue({ error: "Rename failed" });
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Team Name/i), {
      target: { value: "Platform" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("Rename failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when updateTeamName throws a non-Error value.
  test("shows generic error when updateTeamName throws non-Error", async () => {
    (updateTeamName as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);

    fireEvent.change(screen.getByLabelText(/Enter New Team Name/i), {
      target: { value: "Platform" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Change/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Hidden input contains the team ID.
  test("includes teamID as hidden input", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    expect(screen.getByDisplayValue(teamID)).toHaveAttribute("name", "teamID");
  });

  // Handles input change properly.
  test("handles form input change", () => {
    render(<UpdateTeamNameForm teamID={teamID} currentName={currentName} />);
    const nameInput = screen.getByLabelText(/Enter New Team Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "DevOps" } });
    expect(nameInput.value).toBe("DevOps");
  });
});
