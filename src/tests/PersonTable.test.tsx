import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import PersonTable from "@/components/PersonsTable";

interface Person {
  id: string;
  name: string;
  position: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

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

  test("should display no data rows when no persons are provided", () => {
    render(<PersonTable persons={[]} />);

    // Check if headers are present
    expect(screen.getByText(/Name/i)).toBeInTheDocument(); // Headers should be present
    expect(screen.getByText(/Position/i)).toBeInTheDocument(); // Headers should be present
    expect(screen.getByText(/Email/i)).toBeInTheDocument(); // Headers should be present
    expect(screen.getByText(/Created At/i)).toBeInTheDocument(); // Headers should be present
    expect(screen.getByText(/Updated At/i)).toBeInTheDocument(); // Headers should be present

    // Check if there are no data rows
    const rows = screen.queryAllByRole("row");
    expect(rows).toHaveLength(1); // Only the header row should be present
  });
});
