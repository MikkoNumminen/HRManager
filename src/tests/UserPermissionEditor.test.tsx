import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserPermissionEditor from "../components/UserPermissionEditor";
import { updateUserRole, updateUserPermission, kickOutUser } from "@/features/admin/actions";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/features/admin/actions", () => ({
  updateUserRole: jest.fn(),
  updateUserPermission: jest.fn(),
  kickOutUser: jest.fn(),
}));

jest.mock("@/features/twoFactor/actions", () => ({
  adminResetTwoFactor: jest.fn(),
}));

const roleDefaults: Record<string, string[]> = {
  superuser: ["person:create", "person:read", "admin:manage_users"],
  administrator: ["person:create", "person:read"],
  user: ["person:read"],
  guest: ["person:read"],
};

const baseUser = {
  id: "aaa-111",
  email: "alice@example.com",
  name: "Alice",
  role: "administrator",
  overrides: [] as { key: string; granted: boolean }[],
  resolvedPermissions: { "person:create": true, "person:read": true, "admin:manage_users": false },
};

const allKeys = ["person:create", "person:read", "admin:manage_users"];

describe("UserPermissionEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Shows the user's current role in the header
  test("displays the user role chip", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getAllByText("Administrator").length).toBeGreaterThanOrEqual(1);
  });

  // Shows the user's name and email
  test("displays user name and email", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("Alice (alice@example.com)")).toBeInTheDocument();
  });

  // Shows a message when viewing a superuser
  test("shows superuser cannot be changed message", () => {
    const superUser = { ...baseUser, role: "superuser" };
    render(
      <UserPermissionEditor
        user={superUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("The superuser role cannot be changed.")).toBeInTheDocument();
    expect(
      screen.getByText("The superuser has all permissions and cannot be modified."),
    ).toBeInTheDocument();
  });

  // Shows permission table with Grant/Deny buttons for non-superuser
  test("renders permission action buttons for editable user", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    const grantButtons = screen.getAllByText("Grant");
    const denyButtons = screen.getAllByText("Deny");
    expect(grantButtons.length).toBeGreaterThan(0);
    expect(denyButtons.length).toBeGreaterThan(0);
  });

  // Shows all permission keys in the table
  test("renders all permission keys", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("person:create")).toBeInTheDocument();
    expect(screen.getByText("person:read")).toBeInTheDocument();
    expect(screen.getByText("admin:manage_users")).toBeInTheDocument();
  });

  // Shows "you don't have permission" message when canAssignPermissions is false
  test("shows no-permission message when user cannot assign permissions", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={false}
      />,
    );
    expect(
      screen.getByText("You do not have permission to modify user permissions."),
    ).toBeInTheDocument();
  });

  // Grant override flips the effective status to Allowed
  test("grant override shows Allowed effective status", () => {
    const userWithOverride = {
      ...baseUser,
      overrides: [{ key: "admin:manage_users", granted: true }],
    };
    render(
      <UserPermissionEditor
        user={userWithOverride}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // All 3 permissions now show Allowed (2 from role default + 1 from override)
    expect(screen.getAllByText("Allowed")).toHaveLength(3);
  });

  // Shows the Save Role button as disabled when role hasn't changed
  test("Save Role button is disabled when role is unchanged", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    const saveButton = screen.getByRole("button", { name: /Save Role/i });
    expect(saveButton).toBeDisabled();
  });

  // Clicking Grant on a denied permission should call updateUserPermission
  test("calls updateUserPermission when Grant is clicked", async () => {
    (updateUserPermission as jest.Mock).mockResolvedValue(undefined);
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // admin:manage_users is denied (not in admin defaults), so Grant button exists for it
    const grantButtons = screen.getAllByText("Grant");
    fireEvent.click(grantButtons[0]);

    await waitFor(() => {
      expect(updateUserPermission).toHaveBeenCalled();
    });
  });

  // Clicking Deny on an allowed permission should call updateUserPermission
  test("calls updateUserPermission when Deny is clicked", async () => {
    (updateUserPermission as jest.Mock).mockResolvedValue(undefined);
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // person:create is allowed (in admin defaults), so Deny button exists for it
    const denyButtons = screen.getAllByText("Deny");
    fireEvent.click(denyButtons[0]);

    await waitFor(() => {
      expect(updateUserPermission).toHaveBeenCalled();
    });
  });

  // Clicking Role Default on an overridden permission resets it
  test("calls updateUserPermission when Role Default is clicked to reset", async () => {
    (updateUserPermission as jest.Mock).mockResolvedValue(undefined);
    const userWithOverride = {
      ...baseUser,
      overrides: [{ key: "admin:manage_users", granted: true }],
    };
    render(
      <UserPermissionEditor
        user={userWithOverride}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // admin:manage_users has a grant override → toggle is on "grant"
    // Clicking "Role Default" resets it back to the role default
    const defaultButtons = screen.getAllByText("Role Default");
    fireEvent.click(defaultButtons[defaultButtons.length - 1]);

    await waitFor(() => {
      expect(updateUserPermission).toHaveBeenCalled();
    });
  });

  // Shows error message when permission action fails
  test("shows error when permission action fails", async () => {
    (updateUserPermission as jest.Mock).mockResolvedValue({ error: "Action failed" });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    const grantButtons = screen.getAllByText("Grant");
    fireEvent.click(grantButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Action failed")).toBeInTheDocument();
    });
  });

  // Deny override flips the effective status to Denied
  test("deny override shows Denied effective status", () => {
    const userWithDenyOverride = {
      ...baseUser,
      overrides: [{ key: "person:create", granted: false }],
    };
    render(
      <UserPermissionEditor
        user={userWithDenyOverride}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // person:create now denied via override + admin:manage_users denied by default = 2 Denied chips
    const deniedChips = screen.getAllByText("Denied");
    expect(deniedChips).toHaveLength(2);
  });

  // Each permission row renders a three-state toggle (Deny / Role Default / Grant)
  test("renders toggle buttons for each permission", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // 3 permissions × 1 toggle group each, with Deny/Role Default/Grant buttons
    expect(screen.getAllByText("Role Default")).toHaveLength(3);
    expect(screen.getAllByText("Grant")).toHaveLength(3);
    expect(screen.getAllByText("Deny")).toHaveLength(3);
  });

  // Permission groups should show domain headers (capitalized)
  test("renders domain group headers", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("person")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  // Changing the role dropdown should enable the Save Role button
  test("enables Save Role button when role is changed", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // Save Role starts disabled
    expect(screen.getByRole("button", { name: /Save Role/i })).toBeDisabled();

    // Change role via the Select
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /User/i }));

    // Save Role should now be enabled
    expect(screen.getByRole("button", { name: /Save Role/i })).toBeEnabled();
  });

  // Submitting the role form calls updateUserRole via useActionState
  test("calls updateUserRole when Save Role is submitted", async () => {
    (updateUserRole as jest.Mock).mockResolvedValue(undefined);
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );

    // Change role to enable the button
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /User/i }));

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /Save Role/i }));

    await waitFor(() => {
      expect(updateUserRole).toHaveBeenCalled();
    });
  });

  // Shows error message when role update fails
  test("shows error when role update fails", async () => {
    (updateUserRole as jest.Mock).mockResolvedValue({ error: "Role update failed" });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /User/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save Role/i }));

    await waitFor(() => {
      expect(screen.getByText("Role update failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when updateUserRole throws a non-Error value.
  test("shows generic error when role update throws non-Error", async () => {
    (updateUserRole as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /User/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save Role/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Shows generic error when permission update throws a non-Error value.
  test("shows generic error when permission update throws non-Error", async () => {
    (updateUserPermission as jest.Mock).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );

    const grantButtons = screen.getAllByText("Grant");
    fireEvent.click(grantButtons[grantButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Uses fallback color for unknown role values in the role chip.
  test("renders fallback color for unknown role", () => {
    // MUI warns about out-of-range Select value — expected for unknown role test
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const unknownRoleUser = { ...baseUser, role: "custom_role" };
    render(
      <UserPermissionEditor
        user={unknownRoleUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("custom_role")).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  // Shows "Unknown" when user name is null
  test("shows Unknown when user name is null", () => {
    const nullNameUser = { ...baseUser, name: null as string | null };
    render(
      <UserPermissionEditor
        user={nullNameUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("unknown (alice@example.com)")).toBeInTheDocument();
  });

  // Shows "Danger Zone" section with "Kick Out" button for non-superuser
  test("shows kick out button for non-superuser", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kick Out/i })).toBeInTheDocument();
  });

  // Hides the danger zone / kick out section for superusers
  test("hides kick out button for superuser", () => {
    const superUser = { ...baseUser, role: "superuser" };
    render(
      <UserPermissionEditor
        user={superUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    expect(screen.queryByText("Danger Zone")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kick Out/i })).not.toBeInTheDocument();
  });

  // Clicking the kick out button opens the confirmation dialog
  test("opens confirmation dialog when kick out is clicked", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    expect(
      screen.getByText(
        "Are you sure you want to kick out Alice? They will lose access and all permission overrides.",
      ),
    ).toBeInTheDocument();
  });

  // Confirming the kick out dialog calls kickOutUser and redirects
  test("calls kickOutUser and redirects on confirm", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue(undefined);
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // Open the dialog
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    // Click the confirm button inside the dialog
    const confirmButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    const dialogConfirm = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(dialogConfirm);

    await waitFor(() => {
      expect(kickOutUser).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  // Shows error when kickOutUser fails
  test("shows error when kick out fails", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "Cannot kick out" });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const confirmButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Cannot kick out")).toBeInTheDocument();
    });
  });

  // Shows generic error when kickOutUser throws a non-Error value
  test("shows generic error when kick out throws non-Error", async () => {
    (kickOutUser as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    const confirmButtons = screen.getAllByRole("button", { name: /Kick Out/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Cancelling the kick out dialog closes it without calling kickOutUser.
  test("cancelling kick out dialog closes it", async () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    // Dialog should be open
    expect(
      screen.getByText(
        "Are you sure you want to kick out Alice? They will lose access and all permission overrides.",
      ),
    ).toBeInTheDocument();
    // Click Cancel to close
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    // MUI Dialog has a transition — wait for it to close
    await waitFor(() => {
      expect(
        screen.queryByText(
          "Are you sure you want to kick out Alice? They will lose access and all permission overrides.",
        ),
      ).not.toBeInTheDocument();
    });
    expect(kickOutUser).not.toHaveBeenCalled();
  });

  // Uses email as display name for kick out confirm when user name is null
  test("kick out confirm dialog uses email when name is null", () => {
    const nullNameUser = { ...baseUser, name: null as string | null };
    render(
      <UserPermissionEditor
        user={nullNameUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Kick Out/i }));
    expect(
      screen.getByText(
        "Are you sure you want to kick out alice@example.com? They will lose access and all permission overrides.",
      ),
    ).toBeInTheDocument();
  });

  // In demo mode, superuser role dropdown and permission toggles are shown (not locked)
  test("shows role dropdown for superuser in demo session", () => {
    const superUser = { ...baseUser, role: "superuser" };
    render(
      <UserPermissionEditor
        user={superUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
        isDemoSession={true}
      />,
    );
    // Should NOT show the "cannot change" message
    expect(screen.queryByText("The superuser role cannot be changed.")).not.toBeInTheDocument();
    // Should show the role dropdown with superuser option
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  // In demo mode, superuser permissions are editable (not locked)
  test("shows permission toggles for superuser in demo session", () => {
    const superUser = { ...baseUser, role: "superuser" };
    render(
      <UserPermissionEditor
        user={superUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
        isDemoSession={true}
      />,
    );
    // Should NOT show the "all permissions" locked message
    expect(
      screen.queryByText("The superuser has all permissions and cannot be modified."),
    ).not.toBeInTheDocument();
    // Should show Grant/Deny toggles
    expect(screen.getAllByText("Grant").length).toBeGreaterThan(0);
  });

  // In demo mode, the role dropdown includes the superuser option
  test("includes superuser option in role dropdown in demo session", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
        isDemoSession={true}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: /Superuser/i })).toBeInTheDocument();
  });

  // In production mode, the superuser option is not in the role dropdown
  test("excludes superuser option from role dropdown in production", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
        isDemoSession={false}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: /Superuser/i })).not.toBeInTheDocument();
  });

  // In demo mode, kick out button is shown for superuser
  test("shows kick out button for superuser in demo session", () => {
    const superUser = { ...baseUser, role: "superuser" };
    render(
      <UserPermissionEditor
        user={superUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
        isDemoSession={true}
      />,
    );
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kick Out/i })).toBeInTheDocument();
  });
});
