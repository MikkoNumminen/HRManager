import React from "react";
import { render, screen, within } from "@testing-library/react";
import { TeamsTable } from "@/features/teams/components/TeamsTable";

const mockCombinedTeams = [
  {
    teamName: "Development",
    teamId: "1",
    teamManagerId: "mgr-1",
    managerName: "Manager1",
    departmentId: null,
    departmentName: null,
    createdAt: new Date("2023-01-01T10:00:00Z"),
    updatedAt: new Date("2023-01-10T10:00:00Z"),
    members: [
      { personId: "p1", name: "John Doe", email: "john.doe@example.com" },
      { personId: "p2", name: "Jane Smith", email: "jane.smith@example.com" },
    ],
  },
  {
    teamName: "Design",
    teamId: "2",
    teamManagerId: "mgr-2",
    managerName: "Manager2",
    departmentId: null,
    departmentName: null,
    createdAt: new Date("2023-02-01T11:00:00Z"),
    updatedAt: new Date("2023-02-10T11:00:00Z"),
    members: [
      { personId: "p3", name: "Alice Brown", email: "alice.brown@example.com" },
      { personId: "p4", name: "Bob White", email: "bob.white@example.com" },
    ],
  },
];

describe("TeamsTable Component", () => {
  // Check that all five column headers show up in the table.
  test("should render the table headers correctly", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/Team Name/)).toBeInTheDocument();
    expect(table.getByText(/Team Manager/)).toBeInTheDocument();
    expect(table.getByText(/Team Members/)).toBeInTheDocument();
    expect(table.getByText(/Created At/)).toBeInTheDocument();
    expect(table.getByText(/Updated At/)).toBeInTheDocument();
  });

  // Each team's name, manager, members, and timestamps should all be visible.
  test("should render the team data correctly", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    mockCombinedTeams.forEach((team) => {
      expect(table.getByText(team.teamName)).toBeInTheDocument();
      expect(table.getByText(team.managerName)).toBeInTheDocument();
      team.members.forEach((member) => {
        expect(table.getByText(member.name)).toBeInTheDocument();
      });
      expect(table.getByText(new Date(team.createdAt).toLocaleString())).toBeInTheDocument();
      expect(table.getByText(new Date(team.updatedAt).toLocaleString())).toBeInTheDocument();
    });
  });

  // No teams? Show a friendly message instead of an empty table.
  test('should render "No Teams Available" when there are no teams', () => {
    render(<TeamsTable combinedTeams={[]} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/No Teams Available/)).toBeInTheDocument();
  });

  // When a team has no manager, the table should display a fallback text.
  test('should render "No Manager Assigned" when managerName is null', () => {
    const teamNoManager = [
      {
        ...mockCombinedTeams[0],
        teamManagerId: null,
        managerName: null,
      },
    ];
    render(<TeamsTable combinedTeams={teamNoManager} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Manager Assigned")).toBeInTheDocument();
  });
});

describe("TeamsTable minimal mode", () => {
  // In minimal mode, teams show as compact chips instead of the full table.
  // This is the guest view on the homepage.
  test("renders chips instead of a table when minimal is true", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} minimal />);

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();

    // Should NOT have table headers — chips mode has no table structure.
    expect(screen.queryByText(/Team Manager/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Created At/)).not.toBeInTheDocument();
  });

  // Each chip shows initials from the team name in a little avatar.
  // "Development" becomes "D", "Design" becomes "D" too (first letter of each word, max 2).
  test("renders avatar initials in chips", () => {
    const teamsWithMultiWord = [{ ...mockCombinedTeams[0], teamName: "Dev Ops" }];
    render(<TeamsTable combinedTeams={teamsWithMultiWord} minimal />);

    expect(screen.getByText("DO")).toBeInTheDocument();
  });

  // Empty list in minimal mode should show the same empty message.
  test('renders "No Teams Available" in minimal mode when empty', () => {
    render(<TeamsTable combinedTeams={[]} minimal />);

    expect(screen.getByText(/No Teams Available/)).toBeInTheDocument();
  });
});

describe("TeamsTable mobile card view", () => {
  // Card view shows team data in stacked card layout
  test("renders card view with team data", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("Development")).toBeInTheDocument();
    expect(cards.getByText("Design")).toBeInTheDocument();
    expect(cards.getByText("John Doe")).toBeInTheDocument();
  });

  // Card view shows empty message when no teams
  test("renders empty message in card view", () => {
    render(<TeamsTable combinedTeams={[]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Teams Available/)).toBeInTheDocument();
  });

  // Card view shows "No Manager Assigned" fallback
  test("card view shows no manager fallback", () => {
    const teamNoManager = [{ ...mockCombinedTeams[0], teamManagerId: null, managerName: null }];
    render(<TeamsTable combinedTeams={teamNoManager} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Manager Assigned/)).toBeInTheDocument();
  });
});
