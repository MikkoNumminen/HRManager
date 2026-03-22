import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TopBar from "../components/TopBar";
import { useSession, signIn, signOut } from "next-auth/react";
import { seedMockData } from "../serverActions";
import { STORAGE_KEY } from "../tutorialConfig";

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

  // Shows the "Try Demo" button alongside "Sign in" when unauthenticated
  test("shows Try Demo button when unauthenticated", () => {
    render(<TopBar title="Home" />);
    expect(screen.getByRole("button", { name: /Try Demo/i })).toBeInTheDocument();
  });

  // Clicking "Try Demo" calls signIn with the "demo" provider ID
  test("calls signIn with 'demo' when Try Demo is clicked", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByRole("button", { name: /Try Demo/i }));
    expect(signIn).toHaveBeenCalledWith("demo");
  });

  // Clicking "Sign in" calls signIn without arguments (default provider selection)
  test("calls signIn without arguments when Sign in button is clicked", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(signIn).toHaveBeenCalledWith();
  });

  // Both buttons are hidden when user is authenticated
  test("hides Try Demo and Sign in buttons when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    expect(screen.queryByRole("button", { name: /Try Demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign in/i })).not.toBeInTheDocument();
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

  // Shows "Dashboard" menu item when user has dashboard:view permission.
  test("shows Dashboard link when user has dashboard permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: { "dashboard:view": true },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    const link = screen.getByText("Dashboard").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  // Hides "Dashboard" menu item when user lacks dashboard:view permission.
  test("hides Dashboard link when user lacks permission", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: { "dashboard:view": false },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
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

  // Clicking "Keep Existing" in the seed dialog calls seedMockData(false)
  test("calls seedMockData with false when Keep Existing is clicked", async () => {
    (seedMockData as jest.Mock).mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    fireEvent.click(screen.getByText("Keep Existing"));
    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(false);
    });
  });

  // Clicking "Replace All" in the seed dialog calls seedMockData(true)
  test("calls seedMockData with true when Replace All is clicked", async () => {
    (seedMockData as jest.Mock).mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    fireEvent.click(screen.getByText("Replace All"));
    await waitFor(() => {
      expect(seedMockData).toHaveBeenCalledWith(true);
    });
  });

  // Clicking "Cancel" in the seed dialog closes it without calling seedMockData
  test("closes seed dialog on Cancel without calling seedMockData", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(
        screen.queryByText("Do you want to keep your existing data or replace it with mock data?"),
      ).not.toBeInTheDocument();
    });
    expect(seedMockData).not.toHaveBeenCalled();
  });

  // Shows error message when seedMockData fails
  test("shows error when seedMockData fails", async () => {
    (seedMockData as jest.Mock).mockRejectedValue(new Error("Seed failed"));
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    fireEvent.click(screen.getByText("Replace All"));
    await waitFor(() => {
      expect(screen.getByText("Seed failed")).toBeInTheDocument();
    });
  });

  // Shows user avatar image when image URL is provided
  test("shows user avatar image when provided", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Alice", email: "a@b.com", image: "https://example.com/avatar.png" },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    const avatar = screen.getByAltText("Alice");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  // Shows generic error message when seedMockData throws a non-Error value.
  test("shows generic error when seedMockData throws non-Error", async () => {
    (seedMockData as jest.Mock).mockRejectedValue("string error");
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    fireEvent.click(screen.getByText("Replace All"));
    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });

  // Clicking confirm in the reset dialog triggers the resetAll server action.
  test("calls resetAll when reset confirm is clicked", async () => {
    const { resetAll } = jest.requireMock("../serverActions");
    (resetAll as jest.Mock).mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Reset All Data"));
    fireEvent.click(screen.getByText("Reset All"));
    await waitFor(() => {
      expect(resetAll).toHaveBeenCalled();
    });
  });

  // Shows error message when resetAll fails with an Error.
  test("shows error when resetAll fails", async () => {
    const { resetAll } = jest.requireMock("../serverActions");
    (resetAll as jest.Mock).mockRejectedValue(new Error("Reset failed"));
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Reset All Data"));
    fireEvent.click(screen.getByText("Reset All"));
    await waitFor(() => {
      expect(screen.getByText("Reset failed")).toBeInTheDocument();
    });
  });

  // Shows generic error when resetAll throws a non-Error value.
  test("shows generic error when resetAll throws non-Error", async () => {
    const { resetAll } = jest.requireMock("../serverActions");
    (resetAll as jest.Mock).mockRejectedValue(42);
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Reset All Data"));
    fireEvent.click(screen.getByText("Reset All"));
    await waitFor(() => {
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });

  // Closes the reset dialog when cancel is clicked without calling resetAll.
  test("closes reset dialog on cancel without calling resetAll", async () => {
    const { resetAll } = jest.requireMock("../serverActions");
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Reset All Data"));
    // Click Cancel in the confirm dialog
    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(
        screen.queryByText(
          "Are you sure you want to delete all persons and teams? This action cannot be undone.",
        ),
      ).not.toBeInTheDocument();
    });
    expect(resetAll).not.toHaveBeenCalled();
  });

  // Renders avatar fallback icon when user has no name (no initials to show).
  test("renders avatar fallback when name is missing", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "a@b.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    // MUI Avatar renders a PersonIcon fallback when no image or children
    expect(screen.getByTestId("PersonIcon")).toBeInTheDocument();
  });

  // Renders user menu items and clicking them does not crash.
  test("User Management click handler runs without error", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: { "admin:manage_users": true },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    // Clicking the menu item triggers setAnchorEl(null) — should not throw
    expect(() => fireEvent.click(screen.getByText("User Management"))).not.toThrow();
  });

  // Clicking the backdrop triggers the Menu onClose callback without error.
  test("menu onClose callback runs without error", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const { baseElement } = render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Sign out")).toBeInTheDocument();
    // MUI Menu renders a backdrop — clicking it triggers the onClose handler
    const backdrop = baseElement.querySelector(".MuiBackdrop-root") as HTMLElement;
    expect(() => fireEvent.click(backdrop)).not.toThrow();
  });

  // Clicking the backdrop triggers the seed Dialog onClose callback without error.
  test("seed dialog onClose callback runs without error", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    const { baseElement } = render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Load Mock Data"));
    expect(screen.getByText("Keep Existing")).toBeInTheDocument();
    // MUI Dialog renders a backdrop — clicking it triggers the onClose handler
    const backdrops = baseElement.querySelectorAll(".MuiBackdrop-root");
    const dialogBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
    expect(() => fireEvent.click(dialogBackdrop)).not.toThrow();
  });

  // Audit Log menu item click handler runs without error.
  test("Audit Log click handler runs without error", () => {
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
    expect(() => fireEvent.click(screen.getByText("Audit Log"))).not.toThrow();
  });

  // Clears tutorial localStorage when demo user signs out
  test("clears tutorial progress on demo logout", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["view_employees", "add_person"]));
    mockUseSession.mockReturnValue({
      data: { user: { name: "Demo", email: "demo@hrmanager.app", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Sign out"));
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Does not clear tutorial localStorage when non-demo user signs out
  test("does not clear tutorial progress on non-demo logout", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["view_employees"]));
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Sign out"));
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
