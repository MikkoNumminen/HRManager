import { render, screen } from "@testing-library/react";
import FeatureFlagsAdminClient from "../components/FeatureFlagsAdminClient";
import type { FeatureFlag } from "../features/featureFlags/schemas";
import type { AppUser, Permissions } from "../schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/featureFlags/actions", () => ({
  createFeatureFlag: jest.fn(),
  toggleFeatureFlag: jest.fn(),
  deleteFeatureFlag: jest.fn(),
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

const makeUser = (overrides: Partial<AppUser> = {}): AppUser => ({
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
});
