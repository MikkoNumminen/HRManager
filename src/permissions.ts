import { prisma } from "@/db";
import { auth } from "@/auth";

export const PERMISSION_KEYS = [
  "person:create",
  "person:delete",
  "person:update_position",
  "person:update_name",
  "person:update_email",
  "person:read",
  "team:create",
  "team:delete",
  "team:update_name",
  "team:update_manager",
  "team:add_member",
  "team:remove_member",
  "team:read",
  "department:create",
  "department:delete",
  "department:update",
  "department:assign_team",
  "department:read",
  "data:reset",
  "data:seed",
  "admin:manage_users",
  "admin:assign_permissions",
  "admin:view_audit_log",
  "dashboard:view",
  "data:import",
  "data:export",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_DEFAULTS: Record<string, PermissionKey[]> = {
  superuser: [...PERMISSION_KEYS],
  administrator: [
    "person:create",
    "person:delete",
    "person:update_position",
    "person:update_name",
    "person:update_email",
    "person:read",
    "team:create",
    "team:delete",
    "team:update_name",
    "team:update_manager",
    "team:add_member",
    "team:remove_member",
    "team:read",
    "department:create",
    "department:delete",
    "department:update",
    "department:assign_team",
    "department:read",
    "admin:view_audit_log",
    "dashboard:view",
    "data:export",
  ],
  user: ["person:read", "team:read", "department:read"],
  guest: ["person:read", "team:read", "department:read"],
};

export async function seedPermissions(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const key of PERMISSION_KEYS) {
      await tx.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: formatPermissionDescription(key) },
      });
    }
  });
}

function formatPermissionDescription(key: PermissionKey): string {
  const descriptions: Record<PermissionKey, string> = {
    "person:create": "Create new persons",
    "person:delete": "Delete persons",
    "person:update_position": "Update person positions",
    "person:update_name": "Change person names",
    "person:update_email": "Update person emails",
    "person:read": "View person list",
    "team:create": "Create new teams",
    "team:delete": "Delete teams",
    "team:update_name": "Rename teams",
    "team:update_manager": "Assign or change team managers",
    "team:add_member": "Add members to teams",
    "team:remove_member": "Remove members from teams",
    "team:read": "View team list",
    "department:create": "Create new departments",
    "department:delete": "Delete departments",
    "department:update": "Update department name, description, and head",
    "department:assign_team": "Assign or remove teams from departments",
    "department:read": "View department list",
    "data:reset": "Reset all data",
    "data:seed": "Seed mock data",
    "admin:manage_users": "Access user management",
    "admin:assign_permissions": "Grant or revoke user permissions",
    "admin:view_audit_log": "View audit log history",
    "dashboard:view": "View dashboard with analytics",
    "data:import": "Import data from CSV files",
    "data:export": "Export data to CSV files",
  };
  return descriptions[key];
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  return user;
}

export async function resolvePermissions(
  role: string,
  overrides: { key: string; granted: boolean }[],
): Promise<Record<string, boolean>> {
  const defaults = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.guest;
  const result: Record<string, boolean> = {};

  for (const key of PERMISSION_KEYS) {
    result[key] = defaults.includes(key);
  }

  if (role !== "superuser") {
    for (const override of overrides) {
      if (override.key in result) {
        result[override.key] = override.granted;
      }
    }
  }

  return result;
}

export async function getUserPermissions(userId?: string): Promise<Record<string, boolean>> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!user) return resolvePermissions("guest", []);
    const overrides = user.permissions.map((up) => ({
      key: up.permission.key,
      granted: up.granted,
    }));
    return resolvePermissions(user.role, overrides);
  }

  const user = await getCurrentUser();
  if (!user) return resolvePermissions("guest", []);

  const overrides = user.permissions.map((up) => ({
    key: up.permission.key,
    granted: up.granted,
  }));
  return resolvePermissions(user.role, overrides);
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions[permissionKey] ?? false;
}

export async function requirePermission(permissionKey: string): Promise<void> {
  const allowed = await hasPermission(permissionKey);
  if (!allowed) {
    // Lazy import to avoid circular dependency (permissions → auditLog → auth → permissions)
    const { logPermissionDenial } = await import("@/auditLog");
    await logPermissionDenial(permissionKey);
    throw new Error(`Permission denied: ${permissionKey}`);
  }
}
