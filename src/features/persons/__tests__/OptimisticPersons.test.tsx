import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OptimisticPersons from "@/features/persons/components/OptimisticPersons";
import { Person } from "@/schemas";
import { createPerson } from "@/features/persons/actions";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

jest.mock("@/features/persons/actions", () => ({
  createPerson: jest.fn(),
}));

jest.mock("@/constants", () => ({
  PAGE_SIZE: 25,
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

const defaultProps = { total: 1, page: 1, search: "" };

describe("OptimisticPersons", () => {
  beforeEach(() => jest.clearAllMocks());

  // Shows the add form when the user has create permission.
  test("renders AddPersonForm when canCreate is true", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={true} {...defaultProps} />);
    expect(screen.getByText("Add Person")).toBeInTheDocument();
  });

  // Hides the add form when the user lacks create permission.
  test("does not render AddPersonForm when canCreate is false", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={false} {...defaultProps} />);
    expect(screen.queryByText("Add Person")).not.toBeInTheDocument();
  });

  // Displays the heading and table data from server props (both desktop + mobile views).
  test("renders the person table with provided data", () => {
    render(<OptimisticPersons persons={mockPersons} canCreate={false} {...defaultProps} />);
    expect(screen.getByText("Persons")).toBeInTheDocument();
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
  });

  // Shows empty state when there are no persons.
  test("renders empty table when persons array is empty", () => {
    render(<OptimisticPersons persons={[]} canCreate={false} total={0} page={1} search="" />);
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
    render(<OptimisticPersons persons={persons} canCreate={false} total={2} page={1} search="" />);
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

    render(<OptimisticPersons persons={mockPersons} canCreate={true} {...defaultProps} />);

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

  // Pagination is hidden when total fits on one page.
  test("does not render pagination when total <= PAGE_SIZE", () => {
    render(
      <OptimisticPersons persons={mockPersons} canCreate={false} total={10} page={1} search="" />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // Pagination is shown when there are multiple pages.
  test("renders pagination when total > PAGE_SIZE", () => {
    render(
      <OptimisticPersons persons={mockPersons} canCreate={false} total={50} page={1} search="" />,
    );
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
