import React from "react";
import { render, screen, within } from "@testing-library/react";
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

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Name")).toBeInTheDocument();
    expect(table.getByText("Description")).toBeInTheDocument();
    expect(table.getByText("Head")).toBeInTheDocument();
    expect(table.getByText("Teams")).toBeInTheDocument();
    expect(table.getByText("Created At")).toBeInTheDocument();
    expect(table.getByText("Updated At")).toBeInTheDocument();
  });

  // Each department's name, description, head, teams, and dates should be visible.
  test("renders department data correctly", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Engineering")).toBeInTheDocument();
    expect(table.getByText("Software development")).toBeInTheDocument();
    expect(table.getByText("Alice Manager")).toBeInTheDocument();
    expect(table.getByText("Frontend")).toBeInTheDocument();
    expect(table.getByText("Backend")).toBeInTheDocument();
    expect(table.getByText("Product")).toBeInTheDocument();
  });

  // A department with no description should show a dash.
  test("shows dash for null description", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByRole("row", { name: /Product/ });
    const cells = within(productRow).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("-");
  });

  // A department with no head should show fallback text.
  test("shows fallback for null headName", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Head Assigned")).toBeInTheDocument();
  });

  // A department with no teams should show a dash.
  test("shows dash for empty teams", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByRole("row", { name: /Product/ });
    const cells = within(productRow).getAllByRole("cell");
    expect(cells[3]).toHaveTextContent("-");
  });

  // An empty departments array should show the "No Departments Available" message.
  test("shows empty state when no departments", () => {
    render(<DepartmentsTable departments={[]} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Renders formatted dates for each department.
  test("renders formatted dates", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(new Date("2024-01-01T10:00:00Z").toLocaleString())).toBeInTheDocument();
    expect(table.getByText(new Date("2024-01-10T10:00:00Z").toLocaleString())).toBeInTheDocument();
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

describe("DepartmentsTable mobile card view", () => {
  // Card view shows department data in stacked card layout
  test("renders card view with department data", () => {
    render(<DepartmentsTable departments={mockDepartments} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("Engineering")).toBeInTheDocument();
    expect(cards.getByText("Software development")).toBeInTheDocument();
    expect(cards.getByText(/Alice Manager/)).toBeInTheDocument();
    expect(cards.getByText("Frontend")).toBeInTheDocument();
  });

  // Card view shows empty message when no departments
  test("renders empty message in card view", () => {
    render(<DepartmentsTable departments={[]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Card view shows head fallback
  test("card view shows no head fallback", () => {
    const deptNoHead: Department[] = [{ ...mockDepartments[1] }];
    render(<DepartmentsTable departments={deptNoHead} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Head Assigned/)).toBeInTheDocument();
  });
});
