import { render, screen, fireEvent, within } from "@testing-library/react";
import { EditablePersonsTable } from "@/components/PersonsTable";
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

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/Name/)).toBeInTheDocument();
    expect(table.getByText(/Position/)).toBeInTheDocument();
    expect(table.getByText(/Email/)).toBeInTheDocument();
    expect(table.getByText(/Created At/)).toBeInTheDocument();
    expect(table.getByText(/Updated At/)).toBeInTheDocument();
  });

  test("should render person data correctly", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("John Doe")).toBeInTheDocument();
    expect(table.getByText("Developer")).toBeInTheDocument();
    expect(table.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(table.getByText("Jane Smith")).toBeInTheDocument();
    expect(table.getByText("Designer")).toBeInTheDocument();
  });

  test("should navigate to person page on row click", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /John Doe/ });
    fireEvent.click(row);

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  test('should render "No Persons Available" when there are no persons', () => {
    render(<EditablePersonsTable persons={[]} />);

    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText(/No Persons Available/)).toBeInTheDocument();
  });

  test("should render position as empty when value is null", () => {
    const personsWithNull: Person[] = [{ ...mockPersons[0], position: null }];
    render(<EditablePersonsTable persons={personsWithNull} />);

    const row = screen.getByRole("row", { name: /John Doe/ });
    const cells = within(row).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("");
  });

  // Pressing Enter on a row navigates to the person page
  test("should navigate to person page on Enter key", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /John Doe/ });
    fireEvent.keyDown(row, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  // Pressing Space on a row navigates to the person page
  test("should navigate to person page on Space key", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /Jane Smith/ });
    fireEvent.keyDown(row, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/managePersons/2");
  });

  // Pressing a non-trigger key does not navigate
  test("should not navigate on non-trigger key", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const table = within(screen.getByTestId("table-view"));
    const row = table.getByRole("row", { name: /John Doe/ });
    fireEvent.keyDown(row, { key: "Tab" });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("should render email as empty when value is null", () => {
    const personsWithNull: Person[] = [{ ...mockPersons[0], email: null }];
    render(<EditablePersonsTable persons={personsWithNull} />);

    const row = screen.getByRole("row", { name: /John Doe/ });
    const cells = within(row).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("");
  });
});

describe("EditablePersonsTable mobile card view", () => {
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
  ];

  // Clickable cards render with person data
  test("renders clickable cards with person data", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("John Doe")).toBeInTheDocument();
    expect(cards.getByText("Developer")).toBeInTheDocument();
  });

  // Clicking a card navigates to the person page
  test("card click navigates to person page", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const cards = within(screen.getByTestId("card-view"));
    const card = cards.getByRole("button");
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  // Enter key on a card navigates to the person page
  test("card Enter key navigates to person page", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const cards = within(screen.getByTestId("card-view"));
    const card = cards.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  // Space key on a card navigates to the person page
  test("card Space key navigates to person page", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const cards = within(screen.getByTestId("card-view"));
    const card = cards.getByRole("button");
    fireEvent.keyDown(card, { key: " " });

    expect(mockPush).toHaveBeenCalledWith("/managePersons/1");
  });

  // Non-trigger key does not navigate
  test("card non-trigger key does not navigate", () => {
    render(<EditablePersonsTable persons={mockPersons} />);

    const cards = within(screen.getByTestId("card-view"));
    const card = cards.getByRole("button");
    fireEvent.keyDown(card, { key: "Tab" });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // Empty state shows message in card view
  test("card view shows empty message", () => {
    render(<EditablePersonsTable persons={[]} />);

    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/No Persons Available/)).toBeInTheDocument();
  });
});
