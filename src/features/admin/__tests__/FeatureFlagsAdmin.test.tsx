import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeatureFlagsAdminClient from "@/features/admin/components/FeatureFlagsAdminClient";
import type { FeatureFlag } from "@/features/featureFlags/schemas";
import type { AppUser, Permissions } from "@/schemas";
import {
  createFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
} from "@/features/featureFlags/actions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/featureFlags/actions", () => ({
  createFeatureFlag: jest.fn(),
  toggleFeatureFlag: jest.fn(),
  deleteFeatureFlag: jest.fn(),
}));

const mockShowSnackbar = jest.fn();
jest.mock("@/components/shared/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

// Mock next-auth — not used in this component but required by module graph.
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

const NOW = new Date("2026-01-01T00:00:00Z");

const makeFlag = (overrides: Partial<FeatureFlag> = {}): FeatureFlag => ({
  id: "00000000-0000-0000-0000-000000000001",
  name: "test-flag",
  description: "A test feature flag",
  enabled: true,
  scope: "GLOBAL",
  createdAt: NOW,
  updatedAt: NOW,
  userOverrideCount: 0,
  ...overrides,
});

const _makeUser = (overrides: Partial<AppUser> = {}): AppUser => ({
  id: "00000000-0000-0000-0000-000000000010",
  email: "admin@example.com",
  name: "Admin",
  image: null,
  role: "superuser",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const adminPerms: Permissions = { "admin:manage_feature_flags": true };
const guestPerms: Permissions = { "admin:manage_feature_flags": false };

function renderAdmin(flags: FeatureFlag[], permissions: Permissions, users: AppUser[] = []) {
  return render(<FeatureFlagsAdminClient flags={flags} users={users} permissions={permissions} />);
}

// ─── FeatureFlagsAdminClient ──────────────────────────────────

describe("FeatureFlagsAdminClient", () => {
  // Renders a flag name in the table.
  test("renders flag names in the table", () => {
    renderAdmin([makeFlag({ name: "dark-mode" })], adminPerms);
    expect(screen.getByText("dark-mode")).toBeInTheDocument();
  });

  // Renders the create form when user has manage permission (subtitle + button).
  test("renders create form with manage permission", () => {
    renderAdmin([], adminPerms);
    const elements = screen.getAllByText("Create Flag");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  // Hides the create form when user lacks manage permission.
  test("hides create form without manage permission", () => {
    renderAdmin([], guestPerms);
    expect(screen.queryByText("Create Flag")).not.toBeInTheDocument();
  });

  // Renders scope chip for GLOBAL flags — select also shows Global, so use getAllByText.
  test("renders Global scope chip", () => {
    renderAdmin([makeFlag({ scope: "GLOBAL" })], adminPerms);
    const elements = screen.getAllByText("Global");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  // Renders scope chip for USER flags.
  test("renders Per User scope chip", () => {
    renderAdmin([makeFlag({ scope: "USER" })], adminPerms);
    expect(screen.getByText("Per User")).toBeInTheDocument();
  });

  // Shows empty state message when no flags exist.
  test("shows empty state when no flags", () => {
    renderAdmin([], adminPerms);
    expect(screen.getByText("No feature flags configured yet.")).toBeInTheDocument();
  });

  // Renders a switch toggle for each flag when user has manage permission.
  test("renders toggle switch for flags with manage permission", () => {
    renderAdmin([makeFlag()], adminPerms);
    // MUI v7 Switch uses role="switch"
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(1);
  });

  // Renders delete button for each flag when user has manage permission.
  test("renders delete button for flags with manage permission", () => {
    renderAdmin([makeFlag({ id: "00000000-0000-0000-0000-000000000001" })], adminPerms);
    const deleteButtons = screen.getAllByLabelText("Delete Flag");
    expect(deleteButtons).toHaveLength(1);
  });

  // Renders multiple flag rows.
  test("renders multiple flag rows", () => {
    const flags = [
      makeFlag({ id: "00000000-0000-0000-0000-000000000001", name: "flag-a" }),
      makeFlag({ id: "00000000-0000-0000-0000-000000000002", name: "flag-b" }),
    ];
    renderAdmin(flags, adminPerms);
    expect(screen.getByText("flag-a")).toBeInTheDocument();
    expect(screen.getByText("flag-b")).toBeInTheDocument();
  });

  // Shows "-" when flag description is null.
  test("shows dash when description is null", () => {
    renderAdmin([makeFlag({ description: null })], adminPerms);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // Shows userOverrideCount when present.
  test("shows userOverrideCount value", () => {
    renderAdmin([makeFlag({ userOverrideCount: 5 })], adminPerms);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // Shows 0 when userOverrideCount is undefined.
  test("shows 0 when userOverrideCount is undefined", () => {
    renderAdmin([makeFlag({ userOverrideCount: undefined })], adminPerms);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  // Guest sees text labels instead of switches.
  test("guest sees no switch for enabled flag", () => {
    renderAdmin([makeFlag({ enabled: true })], guestPerms);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  // Guest sees Disabled text for disabled flag.
  test("guest sees Disabled text for disabled flag", () => {
    renderAdmin([makeFlag({ enabled: false })], guestPerms);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  // Guest cannot see delete buttons.
  test("guest cannot see delete buttons", () => {
    renderAdmin([makeFlag()], guestPerms);
    expect(screen.queryByLabelText("Delete Flag")).not.toBeInTheDocument();
  });

  // Opens delete dialog when delete button is clicked.
  test("opens delete dialog", async () => {
    renderAdmin([makeFlag()], adminPerms);
    await userEvent.click(screen.getByLabelText("Delete Flag"));
    expect(
      screen.getByText(/Are you sure you want to delete this feature flag/),
    ).toBeInTheDocument();
  });

  // Cancels delete dialog without calling action.
  test("cancel delete does not call deleteFeatureFlag", async () => {
    renderAdmin([makeFlag()], adminPerms);
    await userEvent.click(screen.getByLabelText("Delete Flag"));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(deleteFeatureFlag).not.toHaveBeenCalled();
  });

  // Confirms delete calls deleteFeatureFlag and shows snackbar.
  test("confirm delete calls action and shows snackbar", async () => {
    (deleteFeatureFlag as jest.Mock).mockResolvedValue(undefined);
    renderAdmin([makeFlag({ id: "flag-1" })], adminPerms);
    await userEvent.click(screen.getByLabelText("Delete Flag"));
    // Dialog has a "Delete Flag" button (the confirm button)
    const deleteButtons = screen.getAllByText("Delete Flag");
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => {
      expect(deleteFeatureFlag).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Feature flag deleted");
    });
  });

  // Delete error shows error snackbar.
  test("delete error shows error snackbar", async () => {
    (deleteFeatureFlag as jest.Mock).mockResolvedValue({ error: "Delete failed" });
    renderAdmin([makeFlag()], adminPerms);
    await userEvent.click(screen.getByLabelText("Delete Flag"));
    const deleteButtons = screen.getAllByText("Delete Flag");
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Delete failed");
    });
  });

  // Toggle calls toggleFeatureFlag with correct data.
  test("toggle calls toggleFeatureFlag", async () => {
    (toggleFeatureFlag as jest.Mock).mockResolvedValue(undefined);
    renderAdmin([makeFlag({ id: "flag-1", enabled: true })], adminPerms);
    const switches = screen.getAllByRole("switch");
    // Click the last checkbox (the flag row switch)
    await userEvent.click(switches[switches.length - 1]);
    await waitFor(() => {
      expect(toggleFeatureFlag).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Feature flag updated");
    });
  });

  // Toggle error shows error snackbar.
  test("toggle error shows error snackbar", async () => {
    (toggleFeatureFlag as jest.Mock).mockResolvedValue({ error: "Toggle failed" });
    renderAdmin([makeFlag({ enabled: false })], adminPerms);
    const switches = screen.getAllByRole("switch");
    await userEvent.click(switches[switches.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Toggle failed");
    });
  });

  // Create form submission calls createFeatureFlag.
  test("create form submission calls action", async () => {
    (createFeatureFlag as jest.Mock).mockResolvedValue(undefined);
    renderAdmin([], adminPerms);
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(createFeatureFlag).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Feature flag created");
    });
  });

  // Create form error shows alert.
  test("create error shows error text", async () => {
    (createFeatureFlag as jest.Mock).mockResolvedValue({ error: "Name taken" });
    renderAdmin([], adminPerms);
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Name taken");
    });
  });

  // Flag name links to detail page.
  test("flag name links to detail page", () => {
    renderAdmin([makeFlag({ id: "abc-123", name: "my-flag" })], adminPerms);
    const link = screen.getByText("my-flag");
    expect(link.closest("a")).toHaveAttribute("href", "/admin/feature-flags/abc-123");
  });
});
