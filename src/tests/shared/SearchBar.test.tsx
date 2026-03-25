import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import SearchBar from "@/components/shared/SearchBar";
import OptimisticPersons from "@/features/persons/components/OptimisticPersons";
import OptimisticTeams from "@/features/teams/components/OptimisticTeams";
import OptimisticDepartments from "@/features/departments/components/OptimisticDepartments";
import { Person, CombinedTeam, Department } from "@/schemas";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush, replace: mockReplace })),
}));

jest.mock("@/features/persons/actions", () => ({
  createPerson: jest.fn(),
}));

jest.mock("@/features/teams/actions", () => ({
  createTeam: jest.fn(),
}));

jest.mock("@/features/departments/actions", () => ({
  createDepartment: jest.fn(),
}));

jest.mock("@/constants", () => ({
  PAGE_SIZE: 25,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// SearchBar component tests
// ---------------------------------------------------------------------------
describe("SearchBar", () => {
  // Renders the search input with the translated placeholder text.
  test("renders with translated placeholder", () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Displays the current value passed via props.
  test("displays the controlled value", () => {
    render(<SearchBar value="hello" onChange={jest.fn()} />);
    expect(screen.getByDisplayValue("hello")).toBeInTheDocument();
  });

  // Calls onChange with the new value when the user types.
  test("calls onChange when user types", () => {
    const handleChange = jest.fn();
    render(<SearchBar value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    expect(handleChange).toHaveBeenCalledWith("test");
  });

  // Has an accessible aria-label matching the placeholder.
  test("has an accessible aria-label", () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText("Search\u2026")).toBeInTheDocument();
  });

  // Renders the search icon adornment.
  test("renders the search icon", () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByTestId("SearchIcon")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OptimisticPersons search bar integration tests
// Search is server-side: typing debounces a router.replace call.
// The component shows whatever props it receives — no client-side filtering.
// ---------------------------------------------------------------------------
describe("OptimisticPersons – search bar", () => {
  const persons: Person[] = [
    {
      id: "p1",
      name: "Alice Johnson",
      position: "Developer",
      email: "alice@example.com",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "p2",
      name: "Bob Smith",
      position: "Designer",
      email: "bob@example.com",
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  const defaultProps = { total: 2, page: 1, search: "" };

  // Renders the SearchBar inside the persons list component.
  test("renders SearchBar", () => {
    render(<OptimisticPersons persons={persons} canCreate={false} {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all persons from props when search is empty (no local filtering).
  test("shows all persons from props when search is empty", () => {
    render(<OptimisticPersons persons={persons} canCreate={false} {...defaultProps} />);
    expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
  });

  // Typing debounces and triggers router.replace with q and page params.
  test("debounces router.replace after typing in search bar", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "alice" },
    });
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/\/managePersons\?.*q=alice/));
    });
  });

  // Debounced call resets page to 1 when search changes.
  test("resets page to 1 when search changes", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} total={2} page={2} search="" />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "bob" },
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/page=1/));
    });
  });

  // Reflects the initial search value passed as prop in the input.
  test("initialises input with search prop value", () => {
    render(
      <OptimisticPersons persons={persons} canCreate={false} total={1} page={1} search="alice" />,
    );
    expect(screen.getByDisplayValue("alice")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OptimisticTeams search bar integration tests
// ---------------------------------------------------------------------------
describe("OptimisticTeams – search bar", () => {
  const teams: CombinedTeam[] = [
    {
      teamId: "t1",
      teamName: "Engineering",
      teamManagerId: null,
      managerName: null,
      departmentId: null,
      departmentName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      members: [],
    },
  ];

  const defaultProps = { total: 1, page: 1, search: "" };

  // Renders the SearchBar inside the teams list component.
  test("renders SearchBar", () => {
    render(<OptimisticTeams teams={teams} canCreate={false} {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all teams from props (no local filtering).
  test("shows all teams from props", () => {
    render(<OptimisticTeams teams={teams} canCreate={false} {...defaultProps} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
  });

  // Typing debounces and triggers router.replace for teams.
  test("debounces router.replace after typing", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "engi" },
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringMatching(/\/manageTeams\?.*q=engi/));
    });
  });
});

// ---------------------------------------------------------------------------
// OptimisticDepartments search bar integration tests
// ---------------------------------------------------------------------------
describe("OptimisticDepartments – search bar", () => {
  const departments: Department[] = [
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

  // Renders the SearchBar inside the departments list component.
  test("renders SearchBar", () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all departments from props (no local filtering).
  test("shows all departments from props", () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} {...defaultProps} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
  });

  // Typing debounces and triggers router.replace for departments.
  test("debounces router.replace after typing", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "engi" },
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringMatching(/\/manageDepartments\?.*q=engi/),
      );
    });
  });
});
