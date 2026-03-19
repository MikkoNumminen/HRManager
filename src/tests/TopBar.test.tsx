import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "../components/TopBar";
import { useSession, signIn, signOut } from "next-auth/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("../serverActions", () => ({
  resetAll: jest.fn(),
  seedMockData: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;

describe("TopBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  test("renders the title", () => {
    render(<TopBar title="Manage Persons" />);
    expect(screen.getByText("Manage Persons")).toBeInTheDocument();
  });

  test("does not render back button when backHref is not provided", () => {
    render(<TopBar title="Home" />);
    expect(screen.queryByLabelText("Go back")).not.toBeInTheDocument();
  });

  test("renders back button when backHref is provided", () => {
    render(<TopBar title="Manage Persons" backHref="/" />);
    expect(screen.getByLabelText("Go back")).toBeInTheDocument();
  });

  test("back button links to the correct href", () => {
    render(<TopBar title="Manage Persons" backHref="/managePersons" />);
    const link = screen.getByLabelText("Go back").closest("a");
    expect(link).toHaveAttribute("href", "/managePersons");
  });

  test("shows Sign in button when unauthenticated", () => {
    render(<TopBar title="Home" />);
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  test("calls signIn when Sign in button is clicked", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(signIn).toHaveBeenCalled();
  });

  test("shows user avatar when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign in/i })).not.toBeInTheDocument();
  });

  test("shows user menu on avatar click with name and email", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  test("calls signOut when sign out is clicked", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Sign out"));
    expect(signOut).toHaveBeenCalled();
  });

  test("displays user initials when no image is provided", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  // Shows the "User Management" menu item when user has admin:manage_users permission
  test("shows User Management link when user has admin permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice Smith",
          email: "alice@example.com",
          image: null,
          permissions: { "admin:manage_users": true },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("User Management")).toBeInTheDocument();
    const link = screen.getByText("User Management").closest("a");
    expect(link).toHaveAttribute("href", "/admin");
  });

  // Hides the "User Management" menu item when user lacks admin permission
  test("hides User Management link when user lacks admin permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice Smith",
          email: "alice@example.com",
          image: null,
          permissions: { "admin:manage_users": false },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  // Hides the "User Management" menu item when permissions object is missing entirely
  test("hides User Management link when no permissions in session", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText("User Management")).not.toBeInTheDocument();
  });

  // Shows "Load Mock Data" menu item when user has data:seed permission
  test("shows Load Mock Data when user has data:seed permission", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true, "data:reset": false } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Load Mock Data")).toBeInTheDocument();
    expect(screen.queryByText("Reset All Data")).not.toBeInTheDocument();
  });

  // Shows "Reset All Data" menu item when user has data:reset permission
  test("shows Reset All Data when user has data:reset permission", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": false, "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Reset All Data")).toBeInTheDocument();
    expect(screen.queryByText("Load Mock Data")).not.toBeInTheDocument();
  });

  // Hides dev tools menu items when no permissions are passed
  test("hides dev tools when no permissions prop", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText("Load Mock Data")).not.toBeInTheDocument();
    expect(screen.queryByText("Reset All Data")).not.toBeInTheDocument();
  });

  // Opens seed dialog when "Load Mock Data" is clicked
  test("opens seed dialog on Load Mock Data click", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    expect(screen.getByText("Keep Existing")).toBeInTheDocument();
    expect(screen.getByText("Replace All")).toBeInTheDocument();
  });

  // Opens reset dialog when "Reset All Data" is clicked
  test("opens reset dialog on Reset All Data click", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Reset All Data"));
    expect(
      screen.getByText(
        "Are you sure you want to delete all persons and teams? This action cannot be undone.",
      ),
    ).toBeInTheDocument();
  });

  // Shows "Audit Log" menu item when user has admin:view_audit_log permission
  test("shows Audit Log link when user has audit log permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: { "admin:view_audit_log": true },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
    const link = screen.getByText("Audit Log").closest("a");
    expect(link).toHaveAttribute("href", "/admin/audit");
  });

  // Hides "Audit Log" menu item when user lacks the permission
  test("hides Audit Log link when user lacks permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: { "admin:view_audit_log": false },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });
});
