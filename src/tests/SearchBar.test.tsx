import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchBar from "@/components/SearchBar";
import OptimisticPersons from "@/components/OptimisticPersons";
import OptimisticTeams from "@/components/OptimisticTeams";
import OptimisticDepartments from "@/components/OptimisticDepartments";
import { Person, CombinedTeam, Department } from "@/schemas";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../serverActions", () => ({
  createPerson: jest.fn(),
  createTeam: jest.fn(),
  createDepartment: jest.fn(),
}));

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
// OptimisticPersons search / filtering tests
// ---------------------------------------------------------------------------
describe("OptimisticPersons – search filtering", () => {
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
    {
      id: "p3",
      name: "Charlie Brown",
      position: null,
      email: null,
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  beforeEach(() => jest.clearAllMocks());

  // Renders the SearchBar inside the persons page.
  test("renders SearchBar", () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all persons when the search field is empty.
  test("shows all persons when search is empty", () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Charlie Brown").length).toBeGreaterThanOrEqual(1);
  });

  // Filters persons by name — only matching person should remain visible.
  test("filters persons by name", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "alice" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
    });
  });

  // Filters persons by email.
  test("filters persons by email", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "bob@example" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument();
    });
  });

  // Filters persons by position.
  test("filters persons by position", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "designer" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument();
    });
  });

  // Search is case-insensitive.
  test("search is case-insensitive", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "ALICE" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Returns no results when search term does not match any person.
  test("shows no persons when search matches nothing", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "zzzznonexistent" },
    });
    await waitFor(() => {
      expect(screen.queryByText("Alice Johnson")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
    });
  });

  // Clearing the search restores all persons.
  test("clearing search restores all persons", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    const searchInput = screen.getByPlaceholderText("Search\u2026");

    fireEvent.change(searchInput, { target: { value: "alice" } });
    await waitFor(() => {
      expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Charlie Brown").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Handles persons with null email and position gracefully.
  test("does not crash filtering persons with null fields", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "charlie" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Charlie Brown").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Whitespace-only search shows all persons (trimmed to empty string).
  test("whitespace-only search shows all persons", async () => {
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "   " },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// OptimisticTeams search / filtering tests
// ---------------------------------------------------------------------------
describe("OptimisticTeams – search filtering", () => {
  const teams: CombinedTeam[] = [
    {
      teamId: "t1",
      teamName: "Engineering",
      teamManagerId: "m1",
      managerName: "Alice Manager",
      departmentId: "d1",
      departmentName: "Tech",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      members: [
        { personId: "p1", name: "Dev One", email: "dev1@example.com" },
        { personId: "p2", name: "Dev Two", email: null },
      ],
    },
    {
      teamId: "t2",
      teamName: "Design",
      teamManagerId: null,
      managerName: null,
      departmentId: null,
      departmentName: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      members: [{ personId: "p3", name: "Artist One", email: "artist@example.com" }],
    },
    {
      teamId: "t3",
      teamName: "Marketing",
      teamManagerId: null,
      managerName: "Bob Lead",
      departmentId: null,
      departmentName: "Sales",
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
      members: [],
    },
  ];

  beforeEach(() => jest.clearAllMocks());

  // Renders the SearchBar inside the teams page.
  test("renders SearchBar", () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all teams when search is empty.
  test("shows all teams when search is empty", () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
  });

  // Filters teams by team name.
  test("filters teams by teamName", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "engineering" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });
  });

  // Filters teams by manager name.
  test("filters teams by managerName", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "alice manager" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
    });
  });

  // Filters teams by department name.
  test("filters teams by departmentName", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "sales" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
    });
  });

  // Filters teams by member name.
  test("filters teams by member name", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "artist one" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
    });
  });

  // Filters teams by member email.
  test("filters teams by member email", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "dev1@example" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
    });
  });

  // Search is case-insensitive for teams.
  test("search is case-insensitive", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "DESIGN" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
    });
  });

  // Returns no results when search term matches nothing.
  test("shows no teams when search matches nothing", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "zzzznonexistent" },
    });
    await waitFor(() => {
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });
  });

  // Handles teams with null managerName, departmentName, and member email.
  test("does not crash filtering teams with null fields", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "design" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Clearing the search restores all teams.
  test("clearing search restores all teams", async () => {
    render(<OptimisticTeams teams={teams} canCreate={false} />);
    const searchInput = screen.getByPlaceholderText("Search\u2026");

    fireEvent.change(searchInput, { target: { value: "engineering" } });
    await waitFor(() => {
      expect(screen.queryByText("Design")).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// OptimisticDepartments search / filtering tests
// ---------------------------------------------------------------------------
describe("OptimisticDepartments – search filtering", () => {
  const departments: Department[] = [
    {
      id: "d1",
      name: "Engineering",
      description: "Software development",
      headId: "h1",
      headName: "CTO Jane",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      teams: [
        { teamId: "t1", teamName: "Backend" },
        { teamId: "t2", teamName: "Frontend" },
      ],
    },
    {
      id: "d2",
      name: "Marketing",
      description: null,
      headId: null,
      headName: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      teams: [{ teamId: "t3", teamName: "Social Media" }],
    },
    {
      id: "d3",
      name: "Human Resources",
      description: "People operations",
      headId: "h2",
      headName: "HR Director",
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
      teams: [],
    },
  ];

  beforeEach(() => jest.clearAllMocks());

  // Renders the SearchBar inside the departments page.
  test("renders SearchBar", () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    expect(screen.getByPlaceholderText("Search\u2026")).toBeInTheDocument();
  });

  // Shows all departments when search is empty.
  test("shows all departments when search is empty", () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Human Resources").length).toBeGreaterThanOrEqual(1);
  });

  // Filters departments by name.
  test("filters departments by name", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "engineering" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
      expect(screen.queryByText("Human Resources")).not.toBeInTheDocument();
    });
  });

  // Filters departments by description.
  test("filters departments by description", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "people operations" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Human Resources").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });
  });

  // Filters departments by head name.
  test("filters departments by headName", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "cto jane" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });
  });

  // Filters departments by team name within that department.
  test("filters departments by team name", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "social media" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
      expect(screen.queryByText("Human Resources")).not.toBeInTheDocument();
    });
  });

  // Search is case-insensitive for departments.
  test("search is case-insensitive", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "MARKETING" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
    });
  });

  // Returns no results when search term matches nothing.
  test("shows no departments when search matches nothing", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "zzzznonexistent" },
    });
    await waitFor(() => {
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
      expect(screen.queryByText("Human Resources")).not.toBeInTheDocument();
    });
  });

  // Handles departments with null description, headName, and empty teams.
  test("does not crash filtering departments with null fields", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "marketing" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Clearing the search restores all departments.
  test("clearing search restores all departments", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    const searchInput = screen.getByPlaceholderText("Search\u2026");

    fireEvent.change(searchInput, { target: { value: "engineering" } });
    await waitFor(() => {
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Human Resources").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Whitespace-only search shows all departments (trimmed to empty string).
  test("whitespace-only search shows all departments", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "   " },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Marketing").length).toBeGreaterThanOrEqual(1);
    });
  });

  // Matching a team name under one department (Backend) does not show unrelated departments.
  test("filters by nested team name precisely", async () => {
    render(<OptimisticDepartments departments={departments} canCreate={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search\u2026"), {
      target: { value: "backend" },
    });
    await waitFor(() => {
      expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
      expect(screen.queryByText("Human Resources")).not.toBeInTheDocument();
    });
  });
});
