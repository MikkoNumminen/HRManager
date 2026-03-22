import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptimisticDepartments from "@/components/OptimisticDepartments";
import { Department } from "@/schemas";
import { createDepartment } from "../serverActions";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../serverActions", () => ({
  createDepartment: jest.fn(),
}));

const mockDepartments: Department[] = [
  {
    id: "d1",
    name: "Engineering",
    description: "Dev team",
    headId: null,
    headName: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    teams: [],
  },
];

describe("OptimisticDepartments", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddDepartmentForm when canCreate is true", () => {
    render(<OptimisticDepartments departments={mockDepartments} canCreate={true} />);
    expect(screen.getByText("Add Department")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddDepartmentForm when canCreate is false", () => {
    render(<OptimisticDepartments departments={mockDepartments} canCreate={false} />);
    expect(screen.queryByText("Add Department")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props (both desktop + mobile views).
  test("renders the departments table with provided data", () => {
    render(<OptimisticDepartments departments={mockDepartments} canCreate={false} />);
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
  });

  // Shows empty state when there are no departments.
  test("renders empty table when departments array is empty", () => {
    render(<OptimisticDepartments departments={[]} canCreate={false} />);
    expect(screen.getAllByText("No Departments Available").length).toBeGreaterThanOrEqual(1);
  });

  // Renders multiple departments in the table.
  test("renders all departments passed as props", () => {
    const departments: Department[] = [
      ...mockDepartments,
      {
        id: "d2",
        name: "Marketing",
        description: null,
        headId: null,
        headName: null,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
        teams: [],
      },
    ];
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
  });

  // Submitting the form optimistically adds the new department to the table
  // before the server responds.
  test("optimistically adds department to table on form submit", async () => {
    let resolveCreate!: () => void;
    (createDepartment as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => (resolveCreate = resolve)),
    );

    render(<OptimisticDepartments departments={mockDepartments} canCreate={true} />);

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "New Dept" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getAllByText("New Dept").length).toBeGreaterThanOrEqual(1);
    });

    resolveCreate();
  });
});
