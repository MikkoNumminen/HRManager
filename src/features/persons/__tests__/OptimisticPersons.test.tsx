import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OptimisticPersons from "@/features/persons/components/OptimisticPersons";
import { Person } from "@/schemas";
import { createPerson } from "@/features/persons/actions";
import { useRouter } from "next/navigation";

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

  // ─── Search Debounce ────────────────────────────────────────

  // Typing in the search bar debounces and calls router.replace after 400 ms.
  test("search debounce calls router.replace after 400ms", async () => {
    jest.useFakeTimers();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: mockReplace });

    render(<OptimisticPersons persons={mockPersons} canCreate={false} {...defaultProps} />);

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "Ali" } });

    // Not called yet — debounce pending.
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("/managePersons?q=Ali&page=1"),
    );

    jest.useRealTimers();
  });

  // Searching with a non-empty term then clearing it omits q param and resets to page 1.
  test("search debounce after clearing input omits q param", async () => {
    jest.useFakeTimers();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: mockReplace });

    render(<OptimisticPersons persons={mockPersons} canCreate={false} {...defaultProps} />);

    const searchInput = screen.getByRole("textbox");
    // First type something so debounce fires.
    fireEvent.change(searchInput, { target: { value: "Ali" } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    mockReplace.mockClear();

    // Now clear the search.
    fireEvent.change(searchInput, { target: { value: "" } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("/managePersons?page=1"));
    const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string;
    expect(lastCall).not.toContain("q=");

    jest.useRealTimers();
  });

  // ─── Page Change ────────────────────────────────────────────

  // Clicking a page button calls router.push with the correct page param.
  test("page change without search calls router.push with page param only", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    render(
      <OptimisticPersons persons={mockPersons} canCreate={false} total={50} page={1} search="" />,
    );

    const page2Button = screen.getByRole("button", { name: /page 2/i });
    fireEvent.click(page2Button);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    const call = mockPush.mock.calls[0][0] as string;
    expect(call).not.toContain("q=");
  });

  // When a search term is active, page change includes it in the URL.
  test("page change with active search preserves search param", () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    render(
      <OptimisticPersons
        persons={mockPersons}
        canCreate={false}
        total={50}
        page={1}
        search="Ali"
      />,
    );

    const page2Button = screen.getByRole("button", { name: /page 2/i });
    fireEvent.click(page2Button);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("q=Ali"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  // ─── Initial Search Value ───────────────────────────────────

  // When search prop is non-empty the search field is pre-populated.
  test("renders search bar with initial search value from props", () => {
    render(
      <OptimisticPersons persons={mockPersons} canCreate={false} total={1} page={1} search="Bob" />,
    );
    const searchInput = screen.getByRole("textbox") as HTMLInputElement;
    expect(searchInput.value).toBe("Bob");
  });
});
