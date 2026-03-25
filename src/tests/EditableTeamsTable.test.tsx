import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EditableTeamsTable } from "@/components/TeamsTable";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("EditableTeamsTable Component", () => {
  const mockPush = jest.fn();

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCombinedTeams = [
    {
      teamName: "Development",
      teamId: "1",
      teamManagerId: "person-uuid-1",
      managerName: "Alice Manager",
      departmentId: null,
      departmentName: null,
      createdAt: new Date("2023-01-01T10:00:00Z"),
      updatedAt: new Date("2023-01-10T10:00:00Z"),
      members: [
        { personId: "person-1", name: "John Doe", email: "john.doe@example.com" },
        { personId: "person-2", name: "Jane Smith", email: "jane.smith@example.com" },
      ],
    },
    {
      teamName: "Design",
      teamId: "2",
      teamManagerId: null,
      managerName: null,
      departmentId: null,
      departmentName: null,
      createdAt: new Date("2023-02-01T11:00:00Z"),
      updatedAt: new Date("2023-02-10T11:00:00Z"),
      members: [],
    },
  ];

  test("should render the table headers correctly", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/Team Name/)).toBeInTheDocument();
    expect(table.getByText(/Team Manager/)).toBeInTheDocument();
    expect(table.getByText(/Team Members/)).toBeInTheDocument();
    expect(table.getByText(/Created At/)).toBeInTheDocument();
    expect(table.getByText(/Updated At/)).toBeInTheDocument();
  });

  test("should render team data correctly", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Development")).toBeInTheDocument();
    expect(table.getByText("Alice Manager")).toBeInTheDocument();
    expect(table.getByText("John Doe")).toBeInTheDocument();
    expect(table.getByText("Jane Smith")).toBeInTheDocument();
  });

  test("should show fallback when managerName is null", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Manager Assigned")).toBeInTheDocument();
  });

  test("should show empty cell when team has no members", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const designRow = screen.getByRole("row", { name: /Design/ });
    const cells = within(designRow).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("");
  });

  test("should navigate to team page on row click", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Development/ });
    fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/1");
  });

  // Pressing Enter on a row navigates to the team page
  test("should navigate to team page on Enter key", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Development/ });
    fireEvent.keyDown(row, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/1");
  });

  // Pressing Space on a row navigates to the team page
  test("should navigate to team page on Space key", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Design/ });
    fireEvent.keyDown(row, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/2");
  });

  // Pressing a non-trigger key does not navigate
  test("should not navigate on non-trigger key", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Development/ });
    fireEvent.keyDown(row, { key: "Tab" });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // Shows "Unknown" fallback when a team member has no name
  test("should show unknown fallback for member without name", () => {
    const teamsWithNullMember = [
      {
        ...mockCombinedTeams[0],
        members: [{ personId: "person-x", name: null, email: "x@example.com" }],
      },
    ];
    render(<EditableTeamsTable combinedTeams={teamsWithNullMember} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("unknown")).toBeInTheDocument();
  });

  test('should render "No Teams Available" when there are no teams', () => {
    render(<EditableTeamsTable combinedTeams={[]} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/No Teams Available/)).toBeInTheDocument();
  });
});

describe("EditableTeamsTable mobile card view", () => {
  const mockPush = jest.fn();

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTeam = {
    teamName: "Development",
    teamId: "1",
    teamManagerId: "person-uuid-1",
    managerName: "Alice Manager",
    departmentId: null,
    departmentName: null,
    createdAt: new Date("2023-01-01T10:00:00Z"),
    updatedAt: new Date("2023-01-10T10:00:00Z"),
    members: [{ personId: "person-1", name: "John Doe", email: "john.doe@example.com" }],
  };

  // Clickable cards render with team data
  test("renders clickable cards with team data", () => {
    render(<EditableTeamsTable combinedTeams={[mockTeam]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("Development")).toBeInTheDocument();
    expect(cards.getByText(/Alice Manager/)).toBeInTheDocument();
    expect(cards.getByText("John Doe")).toBeInTheDocument();
  });

  // Clicking a card navigates to the team page
  test("card click navigates to team page", () => {
    render(<EditableTeamsTable combinedTeams={[mockTeam]} />);

    const cards = within(screen.getByTestId("card-view"));
    fireEvent.click(cards.getByRole("button"));

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/1");
  });

  // Enter key on a card navigates to the team page
  test("card Enter key navigates to team page", () => {
    render(<EditableTeamsTable combinedTeams={[mockTeam]} />);

    const cards = within(screen.getByTestId("card-view"));
    fireEvent.keyDown(cards.getByRole("button"), { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/1");
  });

  // Empty state shows message in card view
  test("card view shows empty message", () => {
    render(<EditableTeamsTable combinedTeams={[]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Teams Available/)).toBeInTheDocument();
  });
});
