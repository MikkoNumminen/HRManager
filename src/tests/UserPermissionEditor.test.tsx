import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserPermissionEditor from "../components/UserPermissionEditor";
import { updateUserRole, updateUserPermission } from "../serverActions";

jest.mock("../serverActions", () => ({
  updateUserRole: jest.fn(),
  updateUserPermission: jest.fn(),
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
    (updateUserPermission as jest.Mock).mockRejectedValue(new Error("Action failed"));
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
    expect(screen.getByRole("button", { name: /Save Role/i })).not.toBeDisabled();
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
    (updateUserRole as jest.Mock).mockRejectedValue(new Error("Role update failed"));
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
    (updateUserRole as jest.Mock).mockRejectedValue("string error");
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
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
    });
  });

  // Shows generic error when permission update throws a non-Error value.
  test("shows generic error when permission update throws non-Error", async () => {
    (updateUserPermission as jest.Mock).mockRejectedValue("string error");
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
      expect(screen.getByText("An error occurred")).toBeInTheDocument();
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
});
