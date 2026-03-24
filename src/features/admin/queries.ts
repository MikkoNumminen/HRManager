import { prisma } from "@/db";
import { UserSchema, AppUser } from "@/schemas";
import { resolvePermissions, PERMISSION_KEYS, hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { DEMO_EMAIL } from "@/constants";

export async function getUsers(): Promise<AppUser[]> {
  const demoSessionId = await getDemoSessionId();
  const users = await prisma.user.findMany({
    // Demo sessions only see the demo user — prevents leaking real OAuth user emails
    ...(demoSessionId ? { where: { email: DEMO_EMAIL } } : {}),
    omit: { permissionsVersion: true },
    orderBy: { createdAt: "asc" },
  });

  return users.map((user) => UserSchema.parse(user));
}

export async function getUserById(userId: string) {
  const demoSessionId = await getDemoSessionId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { permissionsVersion: true },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return null;
  // Demo sessions can only view the demo user — prevents accessing real OAuth users by UUID
  if (demoSessionId && user.email !== DEMO_EMAIL) return null;

  const overrides = user.permissions.map((up) => ({
    key: up.permission.key,
    granted: up.granted,
  }));
  const resolvedPermissions = await resolvePermissions(user.role, overrides);

  return {
    ...UserSchema.parse(user),
    overrides,
    resolvedPermissions,
  };
}

export async function getAllPermissionKeys(): Promise<string[]> {
  return [...PERMISSION_KEYS];
}

export interface DataExportCounts {
  persons: number;
  teams: number;
  departments: number;
  auditLogs: number;
}

export async function getDataExportCounts(): Promise<DataExportCounts> {
  const allowed = await hasPermission("data:export");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  const sessionId = await getDemoSessionId();
  const [persons, teams, departments, auditLogs] = await Promise.all([
    prisma.person.count({ where: { deletedAt: null, sessionId } }),
    prisma.team.count({ where: { deletedAt: null, sessionId } }),
    prisma.department.count({ where: { deletedAt: null, sessionId } }),
    isMongoAvailable() ? getAuditLogCollection().countDocuments({ sessionId }) : 0,
  ]);
  return { persons, teams, departments, auditLogs };
}
