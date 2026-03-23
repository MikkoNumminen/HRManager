import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import { auth } from "@/auth";
import {
  dashboardCounts,
  dashboardTeamSizes,
  dashboardDepartmentSizes,
  dashboardGrowthTimeline,
  dashboardRecentActivity,
} from "@prisma/client/sql";
import {
  PersonSchema,
  TeamSchema,
  DepartmentSchema,
  UserSchema,
  UserProfileSchema,
  AuditLogSchema,
  AuditLogFilterSchema,
  DashboardMetricsSchema,
  DashboardRecentActivitySchema,
  Person,
  CombinedTeam,
  Department,
  AppUser,
  UserProfile,
  AuditLog,
  AuditLogFilter,
  DashboardMetrics,
} from "./schemas";
import { resolvePermissions, PERMISSION_KEYS, hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";

export async function getPersons(): Promise<Person[]> {
  const sessionId = await getDemoSessionId();
  const persons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
  });

  return persons.map((person) => PersonSchema.parse(person));
}

export async function getTeams(): Promise<CombinedTeam[]> {
  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      manager: true,
      department: true,
      members: {
        where: { deletedAt: null, sessionId },
        include: {
          person: true,
        },
      },
    },
  });

  return teams.map((team) =>
    TeamSchema.parse({
      teamId: team.teamId,
      teamName: team.teamName,
      teamManagerId: team.teamManagerId ?? null,
      managerName: team.manager?.name ?? null,
      departmentId: team.departmentId ?? null,
      departmentName: team.department?.name ?? null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members:
        team.members?.map((member) => ({
          personId: member.personId,
          name: member.person.name,
          email: member.person.email ?? null,
        })) ?? [],
    }),
  );
}

export async function getDepartments(): Promise<Department[]> {
  const sessionId = await getDemoSessionId();
  const departments = await prisma.department.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      head: true,
      teams: { where: { deletedAt: null, sessionId } },
    },
  });

  return departments.map((dept) =>
    DepartmentSchema.parse({
      id: dept.id,
      name: dept.name,
      description: dept.description ?? null,
      headId: dept.headId ?? null,
      headName: dept.head?.name ?? null,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
      teams: dept.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
      })),
    }),
  );
}

export async function getUsers(): Promise<AppUser[]> {
  const demoSessionId = await getDemoSessionId();
  const users = await prisma.user.findMany({
    // Demo sessions only see the demo user — prevents leaking real OAuth user emails
    ...(demoSessionId ? { where: { email: "demo@hrmanager.app" } } : {}),
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
  if (demoSessionId && user.email !== "demo@hrmanager.app") return null;

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

export async function getAuditLogs(
  filters?: Partial<AuditLogFilter>,
): Promise<{ logs: AuditLog[]; total: number }> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  const parsed = AuditLogFilterSchema.parse(filters ?? {});
  const { userEmail, action, entityType, dateFrom, dateTo, page, pageSize } = parsed;

  const sessionId = await getDemoSessionId();
  const where: Prisma.AuditLogWhereInput = { sessionId };

  if (userEmail) {
    where.userEmail = { contains: userEmail };
  }
  if (action) {
    where.action = action;
  }
  if (entityType) {
    where.entityType = entityType;
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom && { gte: dateFrom }),
      ...(dateTo && { lte: dateTo }),
    };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      omit: { sessionId: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => AuditLogSchema.parse(log)),
    total,
  };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sessionId = await getDemoSessionId();
  // Prisma Typed SQL doesn't support nullable params, but PostgreSQL
  // IS NOT DISTINCT FROM handles null correctly at the query level
  const sid = sessionId as string;

  const [countsRows, teamSizes, departmentSizes, growthTimeline, recentActivityRows] =
    await Promise.all([
      prisma.$queryRawTyped(dashboardCounts(sid)),
      prisma.$queryRawTyped(dashboardTeamSizes(sid)),
      prisma.$queryRawTyped(dashboardDepartmentSizes(sid)),
      prisma.$queryRawTyped(dashboardGrowthTimeline(sid)),
      prisma.$queryRawTyped(dashboardRecentActivity(sid)),
    ]);

  const counts = countsRows[0];
  const recentActivity = recentActivityRows.map((log) => DashboardRecentActivitySchema.parse(log));

  return DashboardMetricsSchema.parse({
    totalPersons: counts?.totalPersons ?? 0,
    totalTeams: counts?.totalTeams ?? 0,
    totalDepartments: counts?.totalDepartments ?? 0,
    totalUsers: counts?.totalUsers ?? 0,
    teamSizes: teamSizes.map((t) => ({
      teamName: t.teamName,
      memberCount: t.memberCount ?? 0,
    })),
    departmentSizes: departmentSizes.map((d) => ({
      departmentName: d.departmentName,
      teamCount: d.teamCount ?? 0,
    })),
    growthTimeline: growthTimeline.map((g) => ({
      date: g.date ?? "",
      persons: g.persons ?? 0,
      teams: g.teams ?? 0,
      departments: g.departments ?? 0,
    })),
    recentActivity,
  });
}

export async function getAuditLogUserEmails(): Promise<string[]> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  const sessionId = await getDemoSessionId();
  const results = await prisma.auditLog.findMany({
    select: { userEmail: true },
    distinct: ["userEmail"],
    where: { userEmail: { not: null }, sessionId },
    orderBy: { userEmail: "asc" },
  });
  return results.map((r) => r.userEmail!);
}

export async function getProfile(): Promise<UserProfile | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    omit: { permissionsVersion: true },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return null;

  const overrides = user.permissions.map((up) => ({
    key: up.permission.key,
    granted: up.granted,
  }));
  const resolvedPermissions = await resolvePermissions(user.role, overrides);

  return UserProfileSchema.parse({
    ...user,
    resolvedPermissions,
  });
}
