import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptimisticTeams from "@/features/teams/components/OptimisticTeams";
import { CombinedTeam } from "@/schemas";
import { createTeam } from "@/features/teams/actions";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

jest.mock("@/features/teams/actions", () => ({
  createTeam: jest.fn(),
}));

jest.mock("../constants", () => ({
  PAGE_SIZE: 25,
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

const defaultProps = { total: 1, page: 1, search: "" };

describe("OptimisticTeams", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddTeamForm when canCreate is true", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={true} {...defaultProps} />);
    expect(screen.getByText("Add Team")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddTeamForm when canCreate is false", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} {...defaultProps} />);
    expect(screen.queryByText("Add Team")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props (both desktop + mobile views).
  test("renders the teams table with provided data", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} {...defaultProps} />);
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
  });

  // Shows empty state when there are no teams.
  test("renders empty table when teams array is empty", () => {
    render(<OptimisticTeams teams={[]} canCreate={false} total={0} page={1} search="" />);
    expect(screen.getAllByText("No Teams Available").length).toBeGreaterThanOrEqual(1);
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
    render(<OptimisticTeams teams={teams} canCreate={false} total={2} page={1} search="" />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
  });

  // Submitting the form optimistically adds the new team to the table
  // before the server responds.
  test("optimistically adds team to table on form submit", async () => {
    let resolveCreate!: () => void;
    (createTeam as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => (resolveCreate = resolve)),
    );

    render(<OptimisticTeams teams={mockTeams} canCreate={true} {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/Enter Team Name/i), {
      target: { value: "New Team" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getAllByText("New Team").length).toBeGreaterThanOrEqual(1);
    });

    resolveCreate();
  });

  // Pagination is hidden when total fits on one page.
  test("does not render pagination when total <= PAGE_SIZE", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} total={10} page={1} search="" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Pagination is shown when there are multiple pages.
  test("renders pagination when total > PAGE_SIZE", () => {
    render(<OptimisticTeams teams={mockTeams} canCreate={false} total={50} page={1} search="" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
