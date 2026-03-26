import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OptimisticDepartments from "@/features/departments/components/OptimisticDepartments";
import { Department } from "@/schemas";
import { createDepartment } from "@/features/departments/actions";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

jest.mock("@/features/departments/actions", () => ({
  createDepartment: jest.fn(),
}));

jest.mock("@/constants", () => ({
  PAGE_SIZE: 25,
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

const defaultProps = { total: 1, page: 1, search: "" };

describe("OptimisticDepartments", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddDepartmentForm when canCreate is true", () => {
    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={true} {...defaultProps} />,
    );
    expect(screen.getByText("Add Department")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddDepartmentForm when canCreate is false", () => {
    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={false} {...defaultProps} />,
    );
    expect(screen.queryByText("Add Department")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props (both desktop + mobile views).
  test("renders the departments table with provided data", () => {
    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={false} {...defaultProps} />,
    );
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
  });

  // Shows empty state when there are no departments.
  test("renders empty table when departments array is empty", () => {
    render(
      <OptimisticDepartments departments={[]} canCreate={false} total={0} page={1} search="" />,
    );
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
    render(
      <OptimisticDepartments
        departments={departments}
        canCreate={false}
        total={2}
        page={1}
        search=""
      />,
    );
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

    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={true} {...defaultProps} />,
    );

    fireEvent.change(screen.getByLabelText(/Enter Department Name/i), {
      target: { value: "New Dept" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getAllByText("New Dept").length).toBeGreaterThanOrEqual(1);
    });

    resolveCreate();
  });

  // Pagination is hidden when total fits on one page.
  test("does not render pagination when total <= PAGE_SIZE", () => {
    render(
      <OptimisticDepartments
        departments={mockDepartments}
        canCreate={false}
        total={10}
        page={1}
        search=""
      />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Pagination is shown when there are multiple pages.
  test("renders pagination when total > PAGE_SIZE", () => {
    render(
      <OptimisticDepartments
        departments={mockDepartments}
        canCreate={false}
        total={50}
        page={1}
        search=""
      />,
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  // ─── Search Debounce ────────────────────────────────────────

  // Typing in the search bar debounces and calls router.replace after 400 ms.
  test("search debounce calls router.replace after 400ms", async () => {
    jest.useFakeTimers();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: mockReplace });

    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={false} {...defaultProps} />,
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "Eng" } });

    // Not called yet — debounce pending.
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("/manageDepartments?q=Eng&page=1"),
    );

    jest.useRealTimers();
  });

  // Searching with a non-empty term then clearing it omits q param and resets to page 1.
  test("search debounce after clearing input omits q param", async () => {
    jest.useFakeTimers();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: mockReplace });

    render(
      <OptimisticDepartments departments={mockDepartments} canCreate={false} {...defaultProps} />,
    );

    const searchInput = screen.getByRole("textbox");
    // First type something so debounce fires.
    fireEvent.change(searchInput, { target: { value: "Eng" } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    mockReplace.mockClear();

    // Now clear the search.
    fireEvent.change(searchInput, { target: { value: "" } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("/manageDepartments?page=1"));
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).not.toContain("q=");

    jest.useRealTimers();
  });

  // ─── Page Change ────────────────────────────────────────────

  // Clicking a page button calls router.push with the correct page param.
  test("page change without search calls router.push with page param only", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    render(
      <OptimisticDepartments
        departments={mockDepartments}
        canCreate={false}
        total={50}
        page={1}
        search=""
      />,
    );

    // Click page 2 in the pagination control.
    const page2Button = screen.getByRole("button", { name: /page 2/i });
    fireEvent.click(page2Button);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    // No search term — url should NOT contain "q=".
    const call = mockPush.mock.calls[0][0] as string;
    expect(call).not.toContain("q=");
  });

  // When a search term is active, page change includes it in the URL.
  test("page change with active search preserves search param", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    render(
      <OptimisticDepartments
        departments={mockDepartments}
        canCreate={false}
        total={50}
        page={1}
        search="Eng"
      />,
    );

    const page2Button = screen.getByRole("button", { name: /page 2/i });
    fireEvent.click(page2Button);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=Eng"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  // ─── Initial Search Value ───────────────────────────────────

  // When search prop is non-empty the search field is pre-populated.
  test("renders search bar with initial search value from props", () => {
    render(
      <OptimisticDepartments
        departments={mockDepartments}
        canCreate={false}
        total={1}
        page={1}
        search="Marketing"
      />,
    );
    const searchInput = screen.getByRole("textbox") as HTMLInputElement;
    expect(searchInput.value).toBe("Marketing");
  });
});
