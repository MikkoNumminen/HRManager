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
  test("should render table with provided persons data", () => {
    render(<PersonTable persons={mockPersons} />);

    // Check if the table headers are rendered
    expect(screen.getByText(/Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Position/i)).toBeInTheDocument();
    expect(screen.getByText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Created At/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated At/i)).toBeInTheDocument();

    // Check if each row is rendered correctly
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
  });

  test('should render "No Persons Available" when there are no persons', () => {
    render(<PersonTable persons={[]} />);

    expect(screen.getByText(/No Persons Available/)).toBeInTheDocument();
  });

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
