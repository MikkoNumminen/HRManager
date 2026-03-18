import { render, screen } from "@testing-library/react";
import PersonTable from "@/components/PersonsTable";
import { Person } from "@/schemas";

const mockPersons: Person[] = [
  {
    id: "1",
    name: "John Doe",
    position: "Developer",
    email: "john.doe@example.com",
    createdAt: new Date("2023-01-01T10:00:00Z"),
    updatedAt: new Date("2023-01-10T10:00:00Z"),
  },
  {
    id: "2",
    name: "Jane Smith",
    position: "Designer",
    email: "jane.smith@example.com",
    createdAt: new Date("2023-02-01T11:00:00Z"),
    updatedAt: new Date("2023-02-10T11:00:00Z"),
  },
];

describe("PersonTable Component", () => {
  // Render the default table view and check that headers and person data show up.
  test("should render table with provided persons data", () => {
    render(<PersonTable persons={mockPersons} />);

    expect(screen.getByText(/Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Created At/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated At/i)).toBeInTheDocument();

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
  });

  // When there are no people to show, display a friendly message instead of an empty table.
  test('should render "No Persons Available" when there are no persons', () => {
    render(<PersonTable persons={[]} />);

    expect(screen.getByText(/No Persons Available/)).toBeInTheDocument();
  });

  // If position or email are null in the database, the table cell should just be empty.
  test("should render empty cells when position and email are null", () => {
    const personsWithNulls: Person[] = [
      {
        ...mockPersons[0],
        position: null,
        email: null,
      },
    ];
    render(<PersonTable persons={personsWithNulls} />);

    const row = screen.getByText("John Doe").closest("tr")!;
    const cells = row.querySelectorAll("td");
    expect(cells[1].textContent).toBe("");
    expect(cells[2].textContent).toBe("");
  });
});

describe("PersonTable minimal mode", () => {
  // In minimal mode, persons are shown as compact chips instead of a full table.
  // This is used on the homepage for unauthenticated (guest) users.
  test("renders chips instead of a table when minimal is true", () => {
    render(<PersonTable persons={mockPersons} minimal />);

    // Should show person names as chips
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // Should NOT show table headers — minimal mode has no table
    expect(screen.queryByText(/Position/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Created At/i)).not.toBeInTheDocument();
  });

  // Each chip shows the person's initials in a little avatar circle.
  // "John Doe" becomes "JD", "Jane Smith" becomes "JS".
  test("renders avatar initials in chips", () => {
    render(<PersonTable persons={mockPersons} minimal />);

    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  // When there are no people and minimal mode is on, show the same empty message.
  test('renders "No Persons Available" in minimal mode when empty', () => {
    render(<PersonTable persons={[]} minimal />);

    expect(screen.getByText(/No Persons Available/)).toBeInTheDocument();
  });

  // A person with a single-word name like "Cher" should get just one initial: "C".
  test("handles single-word names for initials", () => {
    const singleName: Person[] = [{ ...mockPersons[0], name: "Cher" }];
    render(<PersonTable persons={singleName} minimal />);

    expect(screen.getByText("C")).toBeInTheDocument();
  });
});
