import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemoveTeamFromDepartmentForm from "../components/RemoveTeamFromDepartment";
import { removeTeamFromDepartment } from "../serverActions";
import { CombinedTeam } from "../schemas";

jest.mock("../serverActions", () => ({
  removeTeamFromDepartment: jest.fn(),
}));

const mockTeams: CombinedTeam[] = [
  {
    teamId: "team-1",
    teamName: "Frontend",
    teamManagerId: "person-1",
    managerName: "Alice",
    departmentId: "dept-1",
    departmentName: "Engineering",
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  },
  {
    teamId: "team-2",
    teamName: "Backend",
    teamManagerId: "person-2",
    managerName: "Bob",
    departmentId: "dept-1",
    departmentName: "Engineering",
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  },
];

describe("RemoveTeamFromDepartment Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);
    expect(screen.getByText("Remove Team from Department")).toBeInTheDocument();
  });

  // Renders the team select dropdown.
  test("renders the team select field", () => {
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);
    expect(screen.getByLabelText(/Select Team/i)).toBeInTheDocument();
  });

  // Submit button is disabled when no team is selected.
  test("submit button is disabled when no team is selected", () => {
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);
    expect(screen.getByRole("button", { name: /Remove/i })).toBeDisabled();
  });

  // Selecting a team and submitting calls removeTeamFromDepartment.
  test("submits the form after selecting a team", async () => {
    (removeTeamFromDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Frontend"));
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(removeTeamFromDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when removeTeamFromDepartment fails.
  test("shows error message when removeTeamFromDepartment fails", async () => {
    (removeTeamFromDepartment as jest.Mock).mockRejectedValue(new Error("Removal failed"));
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Frontend"));
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when removeTeamFromDepartment throws a non-Error value.
  test("shows generic error when removeTeamFromDepartment throws non-Error", async () => {
    (removeTeamFromDepartment as jest.Mock).mockRejectedValue("string error");
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Frontend"));
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });

  // Hidden input for teamID exists.
  test("includes teamID as hidden input", () => {
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);
    const teamInput = document.querySelector('input[name="teamID"]') as HTMLInputElement;
    expect(teamInput).toBeTruthy();
  });

  // Submit button becomes enabled after selecting a team.
  test("submit button is enabled after selecting a team", async () => {
    render(<RemoveTeamFromDepartmentForm currentTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Backend"));

    expect(screen.getByRole("button", { name: /Remove/i })).not.toBeDisabled();
  });
});
