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
    mockPersons.forEach((person) => {
      expect(screen.getByText(person.name)).toBeInTheDocument();
      expect(screen.getByText(person.position)).toBeInTheDocument();
      expect(screen.getByText(person.email)).toBeInTheDocument();
      expect(
        screen.getByText(new Date(person.createdAt).toLocaleString())
      ).toBeInTheDocument();
      expect(
        screen.getByText(new Date(person.updatedAt).toLocaleString())
      ).toBeInTheDocument();
    });
  });

  test('should render "No Persons Available" when there are no persons', () => {
    render(<PersonTable persons={[]} />);

    expect(screen.getByText(/No Persons Available/)).toBeInTheDocument();
  });
});
