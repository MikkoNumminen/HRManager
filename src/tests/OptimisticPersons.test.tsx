import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptimisticPersons from "@/components/OptimisticPersons";
import { Person } from "@/schemas";
import { createPerson } from "../serverActions";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../serverActions", () => ({
  createPerson: jest.fn(),
}));

const mockPersons: Person[] = [
  {
    id: "1",
    name: "Alice",
    position: "Dev",
    email: "alice@test.com",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

describe("OptimisticPersons", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddPersonForm when canCreate is true", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={true} />);
    expect(screen.getByText("Add Person")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddPersonForm when canCreate is false", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={false} />);
    expect(screen.queryByText("Add Person")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props (both desktop + mobile views).
  test("renders the person table with provided data", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={false} />);
    expect(screen.getByText("Persons")).toBeInTheDocument();
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
  });

  // Shows empty state when there are no persons.
  test("renders empty table when persons array is empty", () => {
    render(<OptimisticPersons persons={[]} canCreate={false} />);
    expect(screen.getAllByText("No Persons Available").length).toBeGreaterThanOrEqual(1);
  });

  // Renders multiple persons in the table.
  test("renders all persons passed as props", () => {
    const persons: Person[] = [
      ...mockPersons,
      {
        id: "2",
        name: "Bob",
        position: null,
        email: "bob@test.com",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      },
    ];
    render(<OptimisticPersons persons={persons} canCreate={false} />);
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob").length).toBeGreaterThanOrEqual(1);
  });

  // Submitting the form optimistically adds the new person to the table
  // before the server responds.
  test("optimistically adds person to table on form submit", async () => {
    let resolveCreate!: () => void;
    (createPerson as jest.Mock).mockImplementation(
      () => new Promise<void>((resolve) => (resolveCreate = resolve)),
    );

    render(<OptimisticPersons persons={mockPersons} canCreate={true} />);

    fireEvent.change(screen.getByLabelText(/Enter Name/i), {
      target: { value: "New Person" },
    });
    fireEvent.change(screen.getByLabelText(/Enter Email/i), {
      target: { value: "new@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getAllByText("New Person").length).toBeGreaterThanOrEqual(1);
    });

    resolveCreate();
  });
});
