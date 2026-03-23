import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import {
  PersonSchema,
  TeamSchema,
  DepartmentSchema,
  UserSchema,
  AuditLogSchema,
  AuditLogFilterSchema,
  DashboardMetricsSchema,
  DashboardRecentActivitySchema,
  Person,
  CombinedTeam,
  Department,
  AppUser,
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
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return users.map((user) => UserSchema.parse(user));
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
  const sessionWhere = { sessionId, deletedAt: null as Date | null };

  const [totalPersons, totalTeams, totalDepartments, totalUsers] = await Promise.all([
    prisma.person.count({ where: sessionWhere }),
    prisma.team.count({ where: sessionWhere }),
    prisma.department.count({ where: sessionWhere }),
    prisma.user.count(),
  ]);

  const teamsWithMembers = await prisma.team.findMany({
    where: sessionWhere,
    select: { teamName: true, _count: { select: { members: { where: { sessionId } } } } },
    orderBy: { teamName: "asc" },
  });
  const teamSizes = teamsWithMembers.map((t) => ({
    teamName: t.teamName,
    memberCount: t._count.members,
  }));

  const departmentsWithTeams = await prisma.department.findMany({
    where: sessionWhere,
    select: { name: true, _count: { select: { teams: { where: sessionWhere } } } },
    orderBy: { name: "asc" },
  });
  const departmentSizes = departmentsWithTeams.map((d) => ({
    departmentName: d.name,
    teamCount: d._count.teams,
  }));

  const [persons, teams, departments] = await Promise.all([
    prisma.person.findMany({
      where: sessionWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.team.findMany({
      where: sessionWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({
      where: sessionWhere,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const growthMap = new Map<string, { persons: number; teams: number; departments: number }>();
  for (const p of persons) {
    const key = p.createdAt.toISOString().slice(0, 10);
    const entry = growthMap.get(key) ?? { persons: 0, teams: 0, departments: 0 };
    entry.persons++;
    growthMap.set(key, entry);
  }
  for (const t of teams) {
    const key = t.createdAt.toISOString().slice(0, 10);
    const entry = growthMap.get(key) ?? { persons: 0, teams: 0, departments: 0 };
    entry.teams++;
    growthMap.set(key, entry);
  }
  for (const d of departments) {
    const key = d.createdAt.toISOString().slice(0, 10);
    const entry = growthMap.get(key) ?? { persons: 0, teams: 0, departments: 0 };
    entry.departments++;
    growthMap.set(key, entry);
  }

  const sortedDates = [...growthMap.keys()].sort();
  let cumPersons = 0,
    cumTeams = 0,
    cumDepts = 0;
  const growthTimeline = sortedDates.map((date) => {
    const entry = growthMap.get(date)!;
    cumPersons += entry.persons;
    cumTeams += entry.teams;
    cumDepts += entry.departments;
    return { date, persons: cumPersons, teams: cumTeams, departments: cumDepts };
  });

  const recentLogs = await prisma.auditLog.findMany({
    where: { sessionId },
    select: { action: true, entityType: true, userEmail: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const recentActivity = recentLogs.map((log) => DashboardRecentActivitySchema.parse(log));

  return DashboardMetricsSchema.parse({
    totalPersons,
    totalTeams,
    totalDepartments,
    totalUsers,
    teamSizes,
    departmentSizes,
    growthTimeline,
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
