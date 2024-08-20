import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import TeamsTable from "@/components/TeamsTable";

describe("TeamsTable Component", () => {
  const mockCombinedTeams = [
    {
      teamName: "Development",
      teamId: "1",
      teamManagerId: "Manager1",
      createdAt: new Date("2023-01-01T10:00:00Z"),
      updatedAt: new Date("2023-01-10T10:00:00Z"),
      members: [
        { name: "John Doe", email: "john.doe@example.com" },
        { name: "Jane Smith", email: "jane.smith@example.com" },
      ],
    },
    {
      teamName: "Design",
      teamId: "2",
      teamManagerId: "Manager2",
      createdAt: new Date("2023-02-01T11:00:00Z"),
      updatedAt: new Date("2023-02-10T11:00:00Z"),
      members: [
        { name: "Alice Brown", email: "alice.brown@example.com" },
        { name: "Bob White", email: "bob.white@example.com" },
      ],
    },
  ];

  test("should render the table headers correctly", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} />);

    expect(screen.getByText(/Team Name/)).toBeInTheDocument();
    expect(screen.getByText(/Team Manager/)).toBeInTheDocument();
    expect(screen.getByText(/Team Members/)).toBeInTheDocument();
    expect(screen.getByText(/Created At/)).toBeInTheDocument();
    expect(screen.getByText(/Updated At/)).toBeInTheDocument();
  });

  test("should render the team data correctly", () => {
    render(<TeamsTable combinedTeams={mockCombinedTeams} />);

    mockCombinedTeams.forEach((team) => {
      expect(screen.getByText(team.teamName)).toBeInTheDocument();
      expect(screen.getByText(team.teamManagerId)).toBeInTheDocument();
      team.members.forEach((member) => {
        expect(screen.getByText(member.name)).toBeInTheDocument();
      });
      expect(
        screen.getByText(new Date(team.createdAt).toLocaleString())
      ).toBeInTheDocument();
      expect(
        screen.getByText(new Date(team.updatedAt).toLocaleString())
      ).toBeInTheDocument();
    });
  });

  test('should render "No Teams Available" when there are no teams', () => {
    render(<TeamsTable combinedTeams={[]} />);

    expect(screen.getByText(/No Teams Available/)).toBeInTheDocument();
  });
});
