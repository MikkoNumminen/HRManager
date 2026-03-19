import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AssignTeamToDepartmentForm from "../components/AssignTeamToDepartment";
import { assignTeamToDepartment } from "../serverActions";
import { CombinedTeam } from "../schemas";

jest.mock("../serverActions", () => ({
  assignTeamToDepartment: jest.fn(),
}));

const mockTeams: CombinedTeam[] = [
  {
    teamId: "team-1",
    teamName: "Frontend",
    teamManagerId: "person-1",
    managerName: "Alice",
    departmentId: null,
    departmentName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  },
  {
    teamId: "team-2",
    teamName: "Backend",
    teamManagerId: "person-2",
    managerName: "Bob",
    departmentId: null,
    departmentName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
  },
];

describe("AssignTeamToDepartment Component", () => {
  const departmentID = "dept-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);
    expect(screen.getByText("Assign Team")).toBeInTheDocument();
  });

  // Renders the team select dropdown.
  test("renders the team select field", () => {
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);
    expect(screen.getByLabelText(/Select Team/i)).toBeInTheDocument();
  });

  // Submit button is disabled when no team is selected.
  test("submit button is disabled when no team is selected", () => {
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);
    expect(screen.getByRole("button", { name: /Assign/i })).toBeDisabled();
  });

  // Selecting a team and submitting calls assignTeamToDepartment.
  test("submits the form after selecting a team", async () => {
    (assignTeamToDepartment as jest.Mock).mockResolvedValue(undefined);
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);

    // Open the dropdown and select a team
    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Frontend"));
    fireEvent.click(screen.getByRole("button", { name: /Assign/i }));

    await waitFor(() => {
      expect(assignTeamToDepartment).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when assignTeamToDepartment fails.
  test("shows error message when assignTeamToDepartment fails", async () => {
    (assignTeamToDepartment as jest.Mock).mockRejectedValue(new Error("Assignment failed"));
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Frontend"));
    fireEvent.click(screen.getByRole("button", { name: /Assign/i }));

    await waitFor(() => {
      expect(screen.getByText("Assignment failed")).toBeInTheDocument();
    });
  });

  // Hidden inputs contain the department ID and selected team ID.
  test("includes departmentID as hidden input", () => {
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);
    const deptInput = document.querySelector('input[name="departmentID"]') as HTMLInputElement;
    expect(deptInput).toBeTruthy();
    expect(deptInput.value).toBe(departmentID);
  });

  // Submit button becomes enabled after selecting a team.
  test("submit button is enabled after selecting a team", async () => {
    render(<AssignTeamToDepartmentForm departmentID={departmentID} availableTeams={mockTeams} />);

    fireEvent.mouseDown(screen.getByLabelText(/Select Team/i));
    fireEvent.click(screen.getByText("Backend"));

    expect(screen.getByRole("button", { name: /Assign/i })).not.toBeDisabled();
  });
});
