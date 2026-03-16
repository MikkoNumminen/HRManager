import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EditableTeamsTable from "@/components/EditableTeamsTable";
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
      createdAt: new Date("2023-02-01T11:00:00Z"),
      updatedAt: new Date("2023-02-10T11:00:00Z"),
      members: [],
    },
  ];

  test("should render the table headers correctly", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    expect(screen.getByText(/Team Name/)).toBeInTheDocument();
    expect(screen.getByText(/Team Manager/)).toBeInTheDocument();
    expect(screen.getByText(/Team Members/)).toBeInTheDocument();
    expect(screen.getByText(/Created At/)).toBeInTheDocument();
    expect(screen.getByText(/Updated At/)).toBeInTheDocument();
  });

  test("should render team data correctly", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Alice Manager")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  test("should show fallback when managerName is null", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    expect(screen.getByText("No Manager Assigned")).toBeInTheDocument();
  });

  test("should show empty cell when team has no members", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const designRow = screen.getByText("Design").closest("tr")!;
    const cells = designRow.querySelectorAll("td");
    expect(cells[2].textContent).toBe("");
  });

  test("should navigate to team page on row click", () => {
    render(<EditableTeamsTable combinedTeams={mockCombinedTeams} />);

    const row = screen.getByText("Development").closest("tr")!;
    fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith("/manageTeams/1");
  });

  test('should render "No Teams Available" when there are no teams', () => {
    render(<EditableTeamsTable combinedTeams={[]} />);

    expect(screen.getByText(/No Teams Available/)).toBeInTheDocument();
  });
});
