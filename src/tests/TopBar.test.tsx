// Enable demo login so the "Try Demo" button renders in tests
process.env.NEXT_PUBLIC_DEMO_LOGIN = "true";

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

  // Shows a permission-gated menu item when the user has the required session permission
  test.each([
    ["User Management", { "admin:manage_users": true }, "/admin"],
    ["Audit Log", { "admin:view_audit_log": true }, "/admin/audit"],
    ["Dashboard", { "dashboard:view": true }, "/dashboard"],
  ])(
    "shows %s link when user has the required permission",
    (linkText, permissions, expectedHref) => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            name: "Alice",
            email: "a@b.com",
            image: null,
            permissions,
          },
        },
        status: "authenticated",
      });
      render(<TopBar title="Home" />);
      fireEvent.click(screen.getByLabelText("User menu"));
      expect(screen.getByText(linkText)).toBeInTheDocument();
      const link = screen.getByText(linkText).closest("a");
      expect(link).toHaveAttribute("href", expectedHref);
    },
  );

  // Hides a permission-gated menu item when the user lacks the required session permission
  test.each([
    ["User Management", { "admin:manage_users": false }],
    ["Audit Log", { "admin:view_audit_log": false }],
    ["Dashboard", { "dashboard:view": false }],
  ])("hides %s link when user lacks the required permission", (linkText, permissions) => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions,
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.queryByText(linkText)).not.toBeInTheDocument();
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

  // --- Mobile drawer tests ---

  // Shows the hamburger menu button for mobile navigation
  test("renders hamburger menu button", () => {
    render(<TopBar title="Home" />);
    expect(screen.getByLabelText("Menu")).toBeInTheDocument();
  });

  // Clicking the hamburger button opens the mobile drawer
  test("opens drawer when hamburger button is clicked", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    // Drawer shows a presentation role element
    expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();
  });

  // Mobile drawer shows user name and email when authenticated
  test("drawer shows user info when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    expect(presentation).toHaveTextContent("Alice Smith");
    expect(presentation).toHaveTextContent("alice@example.com");
  });

  // Mobile drawer shows navigation links when user has permissions
  test("drawer shows navigation links with permissions", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: {
            "admin:manage_users": true,
            "admin:view_audit_log": true,
            "dashboard:view": true,
          },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    // All three nav links appear in the drawer
    const userMgmtLinks = presentation.querySelectorAll('a[href="/admin"]');
    expect(userMgmtLinks.length).toBeGreaterThanOrEqual(1);
    const auditLinks = presentation.querySelectorAll('a[href="/admin/audit"]');
    expect(auditLinks.length).toBeGreaterThanOrEqual(1);
    const dashboardLinks = presentation.querySelectorAll('a[href="/dashboard"]');
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
  });

  // Mobile drawer hides navigation links when user lacks permissions
  test("drawer hides navigation links without permissions", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          name: "Alice",
          email: "a@b.com",
          image: null,
          permissions: {
            "admin:manage_users": false,
            "admin:view_audit_log": false,
            "dashboard:view": false,
          },
        },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    expect(presentation.querySelectorAll('a[href="/admin"]')).toHaveLength(0);
    expect(presentation.querySelectorAll('a[href="/admin/audit"]')).toHaveLength(0);
    expect(presentation.querySelectorAll('a[href="/dashboard"]')).toHaveLength(0);
  });

  // Mobile drawer shows Load Mock Data and Reset All Data when permitted
  test("drawer shows data actions when permitted", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true, "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    expect(presentation).toHaveTextContent("Load Mock Data");
    expect(presentation).toHaveTextContent("Reset All Data");
  });

  // Mobile drawer hides data actions when not permitted
  test("drawer hides data actions when not permitted", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    expect(presentation).not.toHaveTextContent("Load Mock Data");
    expect(presentation).not.toHaveTextContent("Reset All Data");
  });

  // Clicking Load Mock Data in the drawer opens the seed dialog
  test("drawer Load Mock Data opens seed dialog", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:seed": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const loadMockBtn = Array.from(presentation.querySelectorAll("span")).find(
      (el) => el.textContent === "Load Mock Data",
    )!;
    fireEvent.click(loadMockBtn.closest("div[role='button']") ?? loadMockBtn);
    expect(screen.getByText("Keep Existing")).toBeInTheDocument();
    expect(screen.getByText("Replace All")).toBeInTheDocument();
  });

  // Clicking Reset All Data in the drawer opens the reset dialog
  test("drawer Reset All Data opens reset dialog", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const permissions = { "data:reset": true } as never;
    render(<TopBar title="Home" permissions={permissions} />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const resetBtn = Array.from(presentation.querySelectorAll("span")).find(
      (el) => el.textContent === "Reset All Data",
    )!;
    fireEvent.click(resetBtn.closest("div[role='button']") ?? resetBtn);
    expect(
      screen.getByText(
        "Are you sure you want to delete all persons and teams? This action cannot be undone.",
      ),
    ).toBeInTheDocument();
  });

  // Clicking Sign out in the drawer calls signOut and clears demo localStorage
  test("drawer sign out works for demo user", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["view_employees"]));
    mockUseSession.mockReturnValue({
      data: { user: { name: "Demo", email: "demo@hrmanager.app", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const signOutBtn = Array.from(presentation.querySelectorAll("span")).find(
      (el) => el.textContent === "Sign out",
    )!;
    fireEvent.click(signOutBtn.closest("div[role='button']") ?? signOutBtn);
    expect(signOut).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Mobile drawer shows Try Demo and Sign In buttons when unauthenticated
  test("drawer shows auth buttons when unauthenticated", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    expect(presentation).toHaveTextContent("Try Demo");
    expect(presentation).toHaveTextContent("Sign in");
  });

  // Clicking Try Demo in the drawer calls signIn("demo")
  test("drawer Try Demo calls signIn with demo", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const tryDemoBtn = Array.from(presentation.querySelectorAll("button")).find(
      (el) => el.textContent === "Try Demo",
    )!;
    fireEvent.click(tryDemoBtn);
    expect(signIn).toHaveBeenCalledWith("demo");
  });

  // Clicking Sign in in the drawer calls signIn without arguments
  test("drawer Sign in calls signIn without arguments", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const signInBtn = Array.from(presentation.querySelectorAll("button")).find(
      (el) => el.textContent === "Sign in",
    )!;
    fireEvent.click(signInBtn);
    expect(signIn).toHaveBeenCalledWith();
  });

  // Clicking the drawer backdrop closes the drawer without error
  test("drawer onClose callback runs without error", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice", email: "a@b.com", image: null } },
      status: "authenticated",
    });
    const { baseElement } = render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    expect(screen.getByTestId("mobile-drawer")).toBeInTheDocument();
    // MUI Drawer renders a backdrop — clicking it triggers onClose
    const backdrops = baseElement.querySelectorAll(".MuiBackdrop-root");
    const drawerBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
    expect(() => fireEvent.click(drawerBackdrop)).not.toThrow();
  });

  // Drawer does not show user info section when unauthenticated
  test("drawer does not show user info when unauthenticated", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    // Should not have the avatar/user info section
    expect(presentation).not.toHaveTextContent("Alice");
    // But should have Sign in buttons
    expect(presentation).toHaveTextContent("Sign in");
  });

  // Drawer navigation link closes the drawer (via onClick handler)
  test("drawer navigation link click runs without error", () => {
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
    fireEvent.click(screen.getByLabelText("Menu"));
    const presentation = screen.getByTestId("mobile-drawer");
    const navLink = presentation.querySelector('a[href="/admin"]') as HTMLElement;
    expect(() => fireEvent.click(navLink)).not.toThrow();
  });

  // Shows "Profile" link in desktop menu when user is authenticated (no permission needed).
  test("shows Profile link in desktop menu when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Profile")).toBeInTheDocument();
    const link = screen.getByText("Profile").closest("a");
    expect(link).toHaveAttribute("href", "/profile");
  });

  // Profile link should not be visible when unauthenticated (no user menu at all).
  test("does not show Profile link when unauthenticated", () => {
    render(<TopBar title="Home" />);
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  // Shows "Profile" link in mobile drawer when user is authenticated.
  test("shows Profile link in mobile drawer when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Alice", email: "a@b.com", image: null },
      },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const drawer = screen.getByTestId("mobile-drawer");
    const profileLink = drawer.querySelector('a[href="/profile"]');
    expect(profileLink).toBeInTheDocument();
  });

  // Mobile drawer should not show Profile link when unauthenticated.
  test("does not show Profile link in mobile drawer when unauthenticated", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("Menu"));
    const drawer = screen.getByTestId("mobile-drawer");
    const profileLink = drawer.querySelector('a[href="/profile"]');
    expect(profileLink).not.toBeInTheDocument();
  });
});
