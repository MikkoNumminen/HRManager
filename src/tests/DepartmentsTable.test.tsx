import React from "react";
import { render, screen } from "@testing-library/react";
import DepartmentsTable from "@/components/DepartmentsTable";
import { Department } from "@/schemas";

const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Engineering",
    description: "Software development",
    headId: "person-1",
    headName: "Alice Manager",
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-10T10:00:00Z"),
    teams: [
      { teamId: "team-1", teamName: "Frontend" },
      { teamId: "team-2", teamName: "Backend" },
    ],
  },
  {
    id: "dept-2",
    name: "Product",
    description: null,
    headId: null,
    headName: null,
    createdAt: new Date("2024-02-01T11:00:00Z"),
    updatedAt: new Date("2024-02-10T11:00:00Z"),
    teams: [],
  },
];

describe("DepartmentsTable Component", () => {
  // Renders all six column headers in full table mode.
  test("renders table headers correctly", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Head")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Created At")).toBeInTheDocument();
    expect(screen.getByText("Updated At")).toBeInTheDocument();
  });

  // Each department's name, description, head, teams, and dates should be visible.
  test("renders department data correctly", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Software development")).toBeInTheDocument();
    expect(screen.getByText("Alice Manager")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  // A department with no description should show a dash.
  test("shows dash for null description", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByText("Product").closest("tr")!;
    const cells = productRow.querySelectorAll("td");
    expect(cells[1].textContent).toBe("-");
  });

  // A department with no head should show fallback text.
  test("shows fallback for null headName", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("No Head Assigned")).toBeInTheDocument();
  });

  // A department with no teams should show a dash.
  test("shows dash for empty teams", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByText("Product").closest("tr")!;
    const cells = productRow.querySelectorAll("td");
    expect(cells[3].textContent).toBe("-");
  });

  // An empty departments array should show the "No Departments Available" message.
  test("shows empty state when no departments", () => {
    render(<DepartmentsTable departments={[]} />);

    expect(screen.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Renders formatted dates for each department.
  test("renders formatted dates", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText(new Date("2024-01-01T10:00:00Z").toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(new Date("2024-01-10T10:00:00Z").toLocaleString())).toBeInTheDocument();
  });

  // In minimal mode, departments are rendered as chips instead of a table.
  test("renders chips in minimal mode", () => {
    render(<DepartmentsTable departments={mockDepartments} minimal />);

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
    // Table headers should not be present in chip mode
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.queryByText("Head")).not.toBeInTheDocument();
  });

  // Minimal mode with no departments shows empty message.
  test("shows empty message in minimal mode with no departments", () => {
    render(<DepartmentsTable departments={[]} minimal />);

    expect(screen.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Chip avatars show the correct initials (first letter of each word, max 2).
  test("renders correct initials in chip avatars", () => {
    render(<DepartmentsTable departments={mockDepartments} minimal />);

    // "Engineering" → "E", "Product" → "P"
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  // Multi-word department names get two-letter initials.
  test("renders two-letter initials for multi-word names", () => {
    const multiWord: Department[] = [
      {
        id: "dept-3",
        name: "Human Resources",
        description: null,
        headId: null,
        headName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [],
      },
    ];
    render(<DepartmentsTable departments={multiWord} minimal />);

    expect(screen.getByText("HR")).toBeInTheDocument();
  });
});
