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
    expect(screen.getByText("administrator")).toBeInTheDocument();
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

  // Shows override chips when user has permission overrides
  test("shows override chip when user has an override", () => {
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
    expect(screen.getByText("Granted")).toBeInTheDocument();
  });

  // Shows a Reset button when there is an override
  test("shows Reset button for overridden permission", () => {
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
    expect(screen.getByText("Reset")).toBeInTheDocument();
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

  // Clicking Reset on an overridden permission should call updateUserPermission with reset action
  test("calls updateUserPermission when Reset is clicked", async () => {
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
    fireEvent.click(screen.getByText("Reset"));

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

  // Shows "Denied" override chip when a permission is explicitly denied
  test("shows Denied override chip", () => {
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
    // "Denied" appears in role defaults and effective columns too, so check multiple exist
    const deniedChips = screen.getAllByText("Denied");
    expect(deniedChips.length).toBeGreaterThanOrEqual(2);
  });

  // Tooltip headers should be present on Role Default, Override, Effective, Actions
  test("renders column headers with tooltip help cursors", () => {
    render(
      <UserPermissionEditor
        user={baseUser}
        allPermissionKeys={allKeys}
        roleDefaults={roleDefaults}
        canAssignPermissions={true}
      />,
    );
    // Multiple domain groups create duplicate headers, so use getAllByText
    expect(screen.getAllByText("Role Default").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Override").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Effective").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Actions").length).toBeGreaterThan(0);
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
    expect(screen.getByText("Unknown (alice@example.com)")).toBeInTheDocument();
  });
});
