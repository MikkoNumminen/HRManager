import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EditableDepartmentsTable } from "@/features/departments/components/DepartmentsTable";
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

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Name")).toBeInTheDocument();
    expect(table.getByText("Description")).toBeInTheDocument();
    expect(table.getByText("Head")).toBeInTheDocument();
    expect(table.getByText("Teams")).toBeInTheDocument();
    expect(table.getByText("Created At")).toBeInTheDocument();
    expect(table.getByText("Updated At")).toBeInTheDocument();
  });

  // Shows each department's data in the table.
  test("renders department data correctly", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Engineering")).toBeInTheDocument();
    expect(table.getByText("Software development")).toBeInTheDocument();
    expect(table.getByText("Alice Manager")).toBeInTheDocument();
    expect(table.getByText("Product")).toBeInTheDocument();
  });

  // Clicking a row navigates to that department's manage page.
  test("navigates to department page on row click", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    fireEvent.click(table.getByText("Engineering"));
    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Clicking a different department row navigates correctly.
  test("navigates to correct department on second row click", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    fireEvent.click(table.getByText("Product"));
    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-2");
  });

  // Pressing Enter on a row navigates to the department page
  test("navigates to department page on Enter key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Engineering/ });
    fireEvent.keyDown(row, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Pressing Space on a row navigates to the department page
  test("navigates to department page on Space key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Product/ });
    fireEvent.keyDown(row, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-2");
  });

  // Pressing a non-trigger key does not navigate
  test("does not navigate on non-trigger key", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Engineering/ });
    fireEvent.keyDown(row, { key: "Tab" });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // A department with no head shows the fallback text.
  test("shows fallback for null headName", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Head Assigned")).toBeInTheDocument();
  });

  // A department with no description shows a dash.
  test("shows dash for null description", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const productRow = screen.getByRole("row", { name: /Product/ });
    const cells = within(productRow).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("-");
  });

  // Teams are listed as text in the teams column.
  test("renders team names in teams column", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Frontend")).toBeInTheDocument();
    expect(table.getByText("Backend")).toBeInTheDocument();
  });

  // Empty departments array shows the "No Departments Available" message.
  test("shows empty state when no departments", () => {
    render(<EditableDepartmentsTable departments={[]} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Renders formatted dates.
  test("renders formatted dates", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(new Date("2024-01-01T10:00:00Z").toLocaleString())).toBeInTheDocument();
  });
});

describe("EditableDepartmentsTable mobile card view", () => {
  const mockPush = jest.fn();

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Clickable cards render with department data
  test("renders clickable cards with department data", () => {
    render(<EditableDepartmentsTable departments={mockDepartments} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("Engineering")).toBeInTheDocument();
    expect(cards.getByText("Software development")).toBeInTheDocument();
    expect(cards.getByText(/Alice Manager/)).toBeInTheDocument();
  });

  // Clicking a card navigates to the department page
  test("card click navigates to department page", () => {
    render(<EditableDepartmentsTable departments={[mockDepartments[0]]} />);

    const cards = within(screen.getByTestId("card-view"));
    fireEvent.click(cards.getByRole("button"));

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Enter key on a card navigates
  test("card Enter key navigates to department page", () => {
    render(<EditableDepartmentsTable departments={[mockDepartments[0]]} />);

    const cards = within(screen.getByTestId("card-view"));
    fireEvent.keyDown(cards.getByRole("button"), { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/manageDepartments/dept-1");
  });

  // Empty state shows message in card view
  test("card view shows empty message", () => {
    render(<EditableDepartmentsTable departments={[]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("No Departments Available")).toBeInTheDocument();
  });

  // Card view shows head fallback
  test("card view shows no head fallback", () => {
    render(<EditableDepartmentsTable departments={[mockDepartments[1]]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Head Assigned/)).toBeInTheDocument();
  });
});
