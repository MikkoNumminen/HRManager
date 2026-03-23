import { render, screen, fireEvent } from "@testing-library/react";
import UserManagementTable from "../components/UserManagementTable";
import { AppUser } from "../schemas";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUsers: AppUser[] = [
  {
    id: "aaa-111",
    email: "alice@example.com",
    name: "Alice",
    image: null,
    role: "superuser",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "bbb-222",
    email: "bob@example.com",
    name: "Bob",
    image: null,
    role: "administrator",
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  },
  {
    id: "ccc-333",
    email: "carol@example.com",
    name: null,
    image: null,
    role: "user",
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
  },
];

describe("UserManagementTable", () => {
  // Shows a message when there are no users
  test("renders empty state when no users", () => {
    render(<UserManagementTable users={[]} />);
    expect(screen.getByText("No Users Found")).toBeInTheDocument();
  });

  // Shows all user rows with their names and emails
  test("renders all users with name and email", () => {
    render(<UserManagementTable users={mockUsers} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("carol@example.com")).toBeInTheDocument();
  });

  // Shows role chips for each user
  test("renders role chips for each user", () => {
    render(<UserManagementTable users={mockUsers} />);
    expect(screen.getByText("superuser")).toBeInTheDocument();
    expect(screen.getByText("administrator")).toBeInTheDocument();
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  // Shows a dash when user has no name
  test("shows dash for users without a name", () => {
    render(<UserManagementTable users={mockUsers} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // Has the correct table headers
  test("renders correct table headers", () => {
    render(<UserManagementTable users={mockUsers} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Created At")).toBeInTheDocument();
  });

  // Uses fallback color for unknown role values in the role chip.
  test("renders fallback color for unknown role", () => {
    const unknownRoleUser: AppUser = {
      id: "ddd-444",
      email: "dave@example.com",
      name: "Dave",
      image: null,
      role: "custom_role",
      createdAt: new Date("2026-04-01"),
      updatedAt: new Date("2026-04-01"),
    };
    render(<UserManagementTable users={[unknownRoleUser]} />);
    expect(screen.getByText("custom_role")).toBeInTheDocument();
  });

  // Pressing Enter on a row navigates to the admin detail page
  test("navigates to admin page on Enter key", () => {
    mockPush.mockClear();
    render(<UserManagementTable users={mockUsers} />);
    const row = screen.getByRole("row", { name: /Alice/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/admin/aaa-111");
  });

  // Pressing Space on a row navigates to the admin detail page
  test("navigates to admin page on Space key", () => {
    mockPush.mockClear();
    render(<UserManagementTable users={mockUsers} />);
    const row = screen.getByRole("row", { name: /Bob/ });
    fireEvent.keyDown(row, { key: " " });
    expect(mockPush).toHaveBeenCalledWith("/admin/bbb-222");
  });

  // Pressing a non-trigger key does not navigate
  test("does not navigate on non-trigger key", () => {
    mockPush.mockClear();
    render(<UserManagementTable users={mockUsers} />);
    const row = screen.getByRole("row", { name: /Alice/ });
    fireEvent.keyDown(row, { key: "Tab" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Clicking a user row should navigate to their admin detail page
  test("navigates to admin page when row is clicked", () => {
    mockPush.mockClear();
    render(<UserManagementTable users={mockUsers} />);
    fireEvent.click(screen.getByText("Alice"));
    expect(mockPush).toHaveBeenCalledWith("/admin/aaa-111");
  });
});
