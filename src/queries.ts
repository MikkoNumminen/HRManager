import { prisma } from "@/db";
import { auth } from "@/auth";
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
import { getAuditLogCollection } from "@/mongoDb";
import { Filter } from "mongodb";

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
  const col = getAuditLogCollection();
  const filter: Filter<{ sessionId: string | null }> = { sessionId };

  if (userEmail) {
    (filter as Record<string, unknown>).userEmail = { $regex: userEmail, $options: "i" };
  }
  if (action) {
    (filter as Record<string, unknown>).action = action;
  }
  if (entityType) {
    (filter as Record<string, unknown>).entityType = entityType;
  }
  if (dateFrom || dateTo) {
    const createdAtFilter: Record<string, Date> = {};
    if (dateFrom) createdAtFilter.$gte = dateFrom;
    if (dateTo) createdAtFilter.$lte = dateTo;
    (filter as Record<string, unknown>).createdAt = createdAtFilter;
  }

  const [docs, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    col.countDocuments(filter),
  ]);

  const logs = docs.map((doc) =>
    AuditLogSchema.parse({
      id: doc._id!.toString(),
      userId: doc.userId,
      userEmail: doc.userEmail,
      action: doc.action,
      entityType: doc.entityType,
      entityId: doc.entityId,
      before: doc.before,
      after: doc.after,
      createdAt: doc.createdAt,
    }),
  );

  return { logs, total };
}

// Raw SQL result types for dashboard queries (unnamed parameterized queries
// instead of Prisma Typed SQL named prepared statements — PgBouncer compatible)
interface DashboardCountsRow {
  totalPersons: number;
  totalTeams: number;
  totalDepartments: number;
  totalUsers: number;
}
interface TeamSizeRow {
  teamName: string;
  memberCount: number;
}
interface DepartmentSizeRow {
  departmentName: string;
  teamCount: number;
}
interface GrowthTimelineRow {
  date: string;
  persons: number;
  teams: number;
  departments: number;
}
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const allowed = await hasPermission("dashboard:view");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  const sessionId = await getDemoSessionId();

  const [countsRows, teamSizes, departmentSizes, growthTimeline, recentActivityDocs] =
    await Promise.all([
      prisma.$queryRaw<DashboardCountsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalPersons",
          (SELECT COUNT(*)::int FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalTeams",
          (SELECT COUNT(*)::int FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalDepartments",
          (SELECT COUNT(*)::int FROM "User" WHERE (${sessionId}::text IS NULL OR email = 'demo@hrmanager.app')) AS "totalUsers"
      `,
      prisma.$queryRaw<TeamSizeRow[]>`
        SELECT
          t."teamName",
          COUNT(tm.id)::int AS "memberCount"
        FROM "Team" t
        LEFT JOIN "TeamMember" tm
          ON tm."teamId" = t."teamId"
          AND tm."deletedAt" IS NULL
          AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
        WHERE t."deletedAt" IS NULL
          AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
        GROUP BY t."teamId", t."teamName"
        ORDER BY t."teamName" ASC
      `,
      prisma.$queryRaw<DepartmentSizeRow[]>`
        SELECT
          d."name" AS "departmentName",
          COUNT(t."teamId")::int AS "teamCount"
        FROM "Department" d
        LEFT JOIN "Team" t
          ON t."departmentId" = d.id
          AND t."deletedAt" IS NULL
          AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
        WHERE d."deletedAt" IS NULL
          AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
        GROUP BY d.id, d."name"
        ORDER BY d."name" ASC
      `,
      prisma.$queryRaw<GrowthTimelineRow[]>`
        WITH daily AS (
          SELECT date, SUM(p)::int AS p, SUM(t)::int AS t, SUM(d)::int AS d
          FROM (
            SELECT "createdAt"::date AS date, 1 AS p, 0 AS t, 0 AS d
            FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}
            UNION ALL
            SELECT "createdAt"::date AS date, 0 AS p, 1 AS t, 0 AS d
            FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}
            UNION ALL
            SELECT "createdAt"::date AS date, 0 AS p, 0 AS t, 1 AS d
            FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}
          ) combined
          GROUP BY date
        )
        SELECT
          date::text AS "date",
          SUM(p) OVER (ORDER BY date)::int AS "persons",
          SUM(t) OVER (ORDER BY date)::int AS "teams",
          SUM(d) OVER (ORDER BY date)::int AS "departments"
        FROM daily
        ORDER BY date ASC
      `,
      getAuditLogCollection()
        .find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(10)
        .project({ action: 1, entityType: 1, userEmail: 1, createdAt: 1 })
        .toArray(),
    ]);

  const counts = countsRows[0];
  const recentActivity = recentActivityDocs.map((log) => DashboardRecentActivitySchema.parse(log));

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
  const col = getAuditLogCollection();
  const emails = await col.distinct("userEmail", {
    userEmail: { $ne: null },
    sessionId,
  });
  return (emails as string[]).filter(Boolean).sort();
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
    getAuditLogCollection().countDocuments({ sessionId }),
  ]);
  return { persons, teams, departments, auditLogs };
}
