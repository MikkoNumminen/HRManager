import { prisma } from "@/db";
import {
  PersonSchema,
  TeamSchema,
  UserSchema,
  AuditLogSchema,
  AuditLogFilterSchema,
  Person,
  CombinedTeam,
  AppUser,
  AuditLog,
  AuditLogFilter,
} from "./schemas";
import { resolvePermissions, PERMISSION_KEYS } from "@/permissions";

export async function getPersons(): Promise<Person[]> {
  const persons = await prisma.person.findMany();

  return persons.map((person) => PersonSchema.parse(person));
}

export async function getTeams(): Promise<CombinedTeam[]> {
  const teams = await prisma.team.findMany({
    include: {
      manager: true,
      members: {
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
  const parsed = AuditLogFilterSchema.parse(filters ?? {});
  const { userEmail, action, entityType, dateFrom, dateTo, page, pageSize } = parsed;

  const where: Record<string, unknown> = {};

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

export async function getAuditLogUserEmails(): Promise<string[]> {
  const results = await prisma.auditLog.findMany({
    select: { userEmail: true },
    distinct: ["userEmail"],
    where: { userEmail: { not: null } },
    orderBy: { userEmail: "asc" },
  });
  return results.map((r) => r.userEmail!);
}
