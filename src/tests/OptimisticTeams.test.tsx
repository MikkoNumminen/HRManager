import { render, screen } from "@testing-library/react";
import OptimisticTeams from "@/components/OptimisticTeams";
import { CombinedTeam } from "@/schemas";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../serverActions", () => ({
  createTeam: jest.fn(),
}));

const mockTeams: CombinedTeam[] = [
  {
    teamId: "t1",
    teamName: "Engineering",
    teamManagerId: null,
    managerName: null,
    departmentId: null,
    departmentName: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    members: [],
  },
];

describe("OptimisticTeams", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddTeamForm when canCreate is true", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={true} />);
    expect(screen.getByText("Add Team")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddTeamForm when canCreate is false", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} />);
    expect(screen.queryByText("Add Team")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props.
  test("renders the teams table with provided data", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  // Shows empty state when there are no teams.
  test("renders empty table when teams array is empty", () => {
    render(<OptimisticTeams teams={[]} canCreate={false} />);
    expect(screen.getByText("No Teams Available")).toBeInTheDocument();
  });

  // Renders multiple teams in the table.
  test("renders all teams passed as props", () => {
    const teams: CombinedTeam[] = [
      ...mockTeams,
      {
        teamId: "t2",
        teamName: "Design",
        teamManagerId: null,
        managerName: null,
        departmentId: null,
        departmentName: null,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
        members: [],
      },
    ];
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });
});
