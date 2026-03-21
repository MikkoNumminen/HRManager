import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EditableDepartmentsTable from "@/components/EditableDepartmentsTable";
import { useRouter } from "next/navigation";
import { Department } from "@/schemas";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

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

describe("EditableDepartmentsTable Component", () => {
  const mockPush = jest.fn();

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders all six column headers.
  test("renders table headers correctly", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Head")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Created At")).toBeInTheDocument();
    expect(screen.getByText("Updated At")).toBeInTheDocument();
  });

  // Shows each department's data in the table.
  test("renders department data correctly", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Software development")).toBeInTheDocument();
    expect(screen.getByText("Alice Manager")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  // Clicking a row navigates to that department's manage page.
  test("navigates to department page on row click", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    fireEvent.click(screen.getByText("Engineering"));
    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Clicking a different department row navigates correctly.
  test("navigates to correct department on second row click", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    fireEvent.click(screen.getByText("Product"));
    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-2");
  });

  // Pressing Enter on a row navigates to the department page
  test("navigates to department page on Enter key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const row = screen.getByText("Engineering").closest("tr")!;
    fireEvent.keyDown(row, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Pressing Space on a row navigates to the department page
  test("navigates to department page on Space key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const row = screen.getByText("Product").closest("tr")!;
    fireEvent.keyDown(row, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-2");
  });

  // Pressing a non-trigger key does not navigate
  test("does not navigate on non-trigger key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const row = screen.getByText("Engineering").closest("tr")!;
    fireEvent.keyDown(row, { key: "Tab" });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // A department with no head shows the fallback text.
  test("shows fallback for null headName", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("No Head Assigned")).toBeInTheDocument();
  });

  // A department with no description shows a dash.
  test("shows dash for null description", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByText("Product").closest("tr")!;
    const cells = productRow.querySelectorAll("td");
    expect(cells[1].textContent).toBe("-");
  });

  // Teams are listed as text in the teams column.
  test("renders team names in teams column", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });

  // Empty departments array shows the "No Departments Available" message.
  test("shows empty state when no departments", () => {
    render(<EditableDepartmentsTable departments={[]} />);

    expect(screen.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Renders formatted dates.
  test("renders formatted dates", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    expect(screen.getByText(new Date("2024-01-01T10:00:00Z").toLocaleString())).toBeInTheDocument();
  });
});
