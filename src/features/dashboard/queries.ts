import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import {
  DashboardMetricsSchema,
  DashboardRecentActivitySchema,
  DashboardMetrics,
  OrgChartDataSchema,
  OrgChartData,
} from "@/schemas";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { DEMO_EMAIL } from "@/constants";
import { unstable_cache as nextCache } from "next/cache";

// In test environments, unstable_cache requires incrementalCache (Next.js runtime).
// Fall back to a passthrough wrapper so tests call the function directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- must match Next.js Callback type
function cache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { revalidate?: number; tags?: string[] },
): T {
  if (process.env.NODE_ENV === "test") return fn;
  return nextCache(fn, keyParts, options) as unknown as T;
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

// Cache TTL: 5 minutes. Dashboard data changes infrequently relative to page views.
// Invalidated via revalidateTag("dashboard") from server actions.
const CACHE_TTL = 300;

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const allowed = await hasPermission("dashboard:view");
  if (!allowed) {
    throw new ActionError("permissionDenied", "Permission denied");
  }
  const sessionId = await getDemoSessionId();
  return fetchDashboardMetricsCached(sessionId);
}

const fetchDashboardMetricsCached = cache(
  async (sessionId: string | null): Promise<DashboardMetrics> => {
    return fetchDashboardMetricsUncached(sessionId);
  },
  ["dashboard-metrics"],
  { revalidate: CACHE_TTL, tags: ["dashboard"] },
);

async function fetchDashboardMetricsUncached(sessionId: string | null): Promise<DashboardMetrics> {
  const [countsRows, teamSizes, departmentSizes, growthTimeline, recentActivityDocs] =
    await Promise.all([
      prisma.$queryRaw<DashboardCountsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "Person" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalPersons",
          (SELECT COUNT(*)::int FROM "Team" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalTeams",
          (SELECT COUNT(*)::int FROM "Department" WHERE "deletedAt" IS NULL AND "sessionId" IS NOT DISTINCT FROM ${sessionId}) AS "totalDepartments",
          (SELECT COUNT(*)::int FROM "User" WHERE (${sessionId}::text IS NULL OR email = ${DEMO_EMAIL})) AS "totalUsers"
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
      isMongoAvailable()
        ? getAuditLogCollection()
            .find({ sessionId })
            .sort({ createdAt: -1, _id: -1 })
            .limit(10)
            .project({ action: 1, entityType: 1, userEmail: 1, createdAt: 1 })
            .toArray()
        : Promise.resolve([]),
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

export async function getOrgChartData(): Promise<OrgChartData> {
  const allowed = await hasPermission("dashboard:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchOrgChartDataCached(sessionId);
}

const fetchOrgChartDataCached = cache(
  async (sessionId: string | null): Promise<OrgChartData> => {
    return fetchOrgChartDataUncached(sessionId);
  },
  ["org-chart-data"],
  { revalidate: CACHE_TTL, tags: ["dashboard", "org-chart"] },
);

async function fetchOrgChartDataUncached(sessionId: string | null): Promise<OrgChartData> {
  const [departments, allTeams, allPersons, allMembers] = await Promise.all([
    prisma.department.findMany({
      where: { deletedAt: null, sessionId },
      include: {
        head: { select: { id: true, name: true } },
        teams: {
          where: { deletedAt: null, sessionId },
          include: {
            manager: { select: { id: true, name: true } },
            members: {
              where: { deletedAt: null, sessionId },
              include: {
                person: { select: { id: true, name: true, position: true, email: true } },
              },
            },
          },
        },
      },
    }),
    prisma.team.findMany({
      where: { deletedAt: null, sessionId, departmentId: null },
      include: {
        manager: { select: { id: true, name: true } },
        members: {
          where: { deletedAt: null, sessionId },
          include: { person: { select: { id: true, name: true, position: true, email: true } } },
        },
      },
    }),
    prisma.person.findMany({
      where: { deletedAt: null, sessionId },
      select: { id: true, name: true, position: true, email: true },
    }),
    prisma.teamMember.findMany({
      where: { deletedAt: null, sessionId },
      select: { personId: true },
    }),
  ]);

  const assignedPersonIds = new Set(allMembers.map((m) => m.personId));

  return OrgChartDataSchema.parse({
    departments: departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      headId: dept.headId ?? null,
      headName: dept.head?.name ?? null,
      teams: dept.teams.map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        managerId: team.teamManagerId ?? null,
        managerName: team.manager?.name ?? null,
        members: team.members.map((m) => ({
          id: m.person.id,
          name: m.person.name,
          position: m.person.position ?? null,
          email: m.person.email ?? null,
        })),
      })),
    })),
    unassignedTeams: allTeams.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      managerId: team.teamManagerId ?? null,
      managerName: team.manager?.name ?? null,
      members: team.members.map((m) => ({
        id: m.person.id,
        name: m.person.name,
        position: m.person.position ?? null,
        email: m.person.email ?? null,
      })),
    })),
    unassignedPersons: allPersons
      .filter((p) => !assignedPersonIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position ?? null,
        email: p.email ?? null,
      })),
  });
}
