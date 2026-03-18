import { render, screen } from "@testing-library/react";
import UserPermissionEditor from "../components/UserPermissionEditor";

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
});
