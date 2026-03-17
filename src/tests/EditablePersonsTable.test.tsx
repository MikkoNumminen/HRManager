import { render, screen, fireEvent } from "@testing-library/react";
import EditablePersonsTable from "@/components/EditablePersonsTable";
import { useRouter } from "next/navigation";
import { Person } from "@/schemas";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("EditablePersonsTable Component", () => {
  const mockPush = jest.fn();

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test("should render the table headers correctly", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    expect(screen.getByText(/Name/)).toBeInTheDocument();
    expect(screen.getByText(/Position/)).toBeInTheDocument();
    expect(screen.getByText(/Email/)).toBeInTheDocument();
    expect(screen.getByText(/Created At/)).toBeInTheDocument();
    expect(screen.getByText(/Updated At/)).toBeInTheDocument();
  });

  test("should render person data correctly", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
  });

  test("should navigate to person page on row click", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const row = screen.getByText("John Doe").closest("tr")!;
    fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  test('should render "No Persons Available" when there are no persons', () => {
    render(<EditablePersonsTable persons={[]} />);

    expect(screen.getByText(/No Persons Available/)).toBeInTheDocument();
  });

  test("should render position as empty when value is dash", () => {
    const personsWithDash: Person[] = [{ ...mockPersons[0], position: "-" }];
    render(<EditablePersonsTable persons={personsWithDash} />);

    const row = screen.getByText("John Doe").closest("tr")!;
    const cells = row.querySelectorAll("td");
    expect(cells[1].textContent).toBe("");
  });
});
