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
  ReviewTemplateSchema,
  ReviewCycleSchema,
  ReviewRequestSchema,
  ReviewTemplate,
  ReviewCycle,
  ReviewRequest,
  LeaveTypeSchema,
  LeaveRequestSchema,
  LeaveBalanceSchema,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  PositionSchema,
  Position,
  EmployeeProfileSchema,
  EmployeeProfile,
  OrgChartDataSchema,
  OrgChartData,
} from "./schemas";
import { resolvePermissions, PERMISSION_KEYS, hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { Filter } from "mongodb";

import {
  PAGE_SIZE,
  DEMO_EMAIL,
  PersonDeleteImpact,
  TeamDeleteImpact,
  DepartmentDeleteImpact,
} from "@/constants";
export { PAGE_SIZE };

export async function getPersons(): Promise<Person[]> {
  const sessionId = await getDemoSessionId();
  const persons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
  });

  return persons.map((person) => PersonSchema.parse(person));
}

export async function getPositions(): Promise<Position[]> {
  const sessionId = await getDemoSessionId();
  const positions = await prisma.position.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { name: "asc" },
  });

  return positions.map((p) => PositionSchema.parse(p));
}

export async function getPagedPersons(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: Person[]; total: number }> {
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();
  const where = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { position: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      omit: { sessionId: true, deletedAt: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.person.count({ where }),
  ]);
  return { items: persons.map((p) => PersonSchema.parse(p)), total };
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

export async function getPagedTeams(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: CombinedTeam[]; total: number }> {
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();

  // For search we need to post-filter after joining — use findMany with includes and slice
  // Prisma can filter on relation fields but not across OR + relation simultaneously cleanly,
  // so we fetch with relation filter where possible and do member search in JS.
  const baseWhere = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { teamName: { contains: q, mode: "insensitive" as const } },
            { manager: { name: { contains: q, mode: "insensitive" as const } } },
            { department: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where: baseWhere,
      include: {
        manager: true,
        department: true,
        members: {
          where: { deletedAt: null, sessionId },
          include: { person: true },
        },
      },
      orderBy: { teamName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.team.count({ where: baseWhere }),
  ]);

  const items = teams.map((team) =>
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
  return { items, total };
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

export async function getPagedDepartments(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: Department[]; total: number }> {
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();
  const baseWhere = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { head: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where: baseWhere,
      include: {
        head: true,
        teams: { where: { deletedAt: null, sessionId } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.department.count({ where: baseWhere }),
  ]);

  const items = departments.map((dept) =>
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
  return { items, total };
}

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

export async function getAuditLogs(
  filters?: Partial<AuditLogFilter>,
): Promise<{ logs: AuditLog[]; total: number }> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  const parsed = AuditLogFilterSchema.parse(filters ?? {});
  const { userEmail, action, entityType, dateFrom, dateTo, page, pageSize } = parsed;

  if (!isMongoAvailable()) {
    return { logs: [], total: 0 };
  }

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
      .sort({ createdAt: -1, _id: -1 })
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

export async function getAuditLogUserEmails(): Promise<string[]> {
  const allowed = await hasPermission("admin:view_audit_log");
  if (!allowed) {
    throw new Error("Permission denied");
  }
  if (!isMongoAvailable()) {
    return [];
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
    isMongoAvailable() ? getAuditLogCollection().countDocuments({ sessionId }) : 0,
  ]);
  return { persons, teams, departments, auditLogs };
}

export async function getReviewTemplates(): Promise<ReviewTemplate[]> {
  const sessionId = await getDemoSessionId();
  const templates = await prisma.reviewTemplate.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { createdAt: "asc" },
  });

  return templates.map((t) =>
    ReviewTemplateSchema.parse({
      ...t,
      questions: Array.isArray(t.questions) ? t.questions : [],
    }),
  );
}

export async function getReviewTemplate(id: string): Promise<ReviewTemplate | null> {
  const sessionId = await getDemoSessionId();
  const template = await prisma.reviewTemplate.findFirst({
    where: { id, deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
  });

  if (!template) return null;

  return ReviewTemplateSchema.parse({
    ...template,
    questions: Array.isArray(template.questions) ? template.questions : [],
  });
}

export async function getReviewCycles(): Promise<ReviewCycle[]> {
  const sessionId = await getDemoSessionId();
  const cycles = await prisma.reviewCycle.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      template: { select: { name: true } },
      requests: { select: { status: true } },
    },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return cycles.map((c) =>
    ReviewCycleSchema.parse({
      id: c.id,
      name: c.name,
      templateId: c.templateId ?? null,
      templateName: c.template?.name ?? null,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      requestCount: c.requests.length,
      submittedCount: c.requests.filter((r) => r.status === "SUBMITTED").length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }),
  );
}

export async function getReviewCycle(id: string): Promise<
  | (ReviewCycle & {
      requests: ReviewRequest[];
    })
  | null
> {
  const sessionId = await getDemoSessionId();
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id, deletedAt: null, sessionId },
    include: {
      template: { select: { name: true } },
      requests: {
        include: {
          subject: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    omit: { sessionId: true, deletedAt: true },
  });

  if (!cycle) return null;

  const parsedCycle = ReviewCycleSchema.parse({
    id: cycle.id,
    name: cycle.name,
    templateId: cycle.templateId ?? null,
    templateName: cycle.template?.name ?? null,
    status: cycle.status,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    requestCount: cycle.requests.length,
    submittedCount: cycle.requests.filter((r) => r.status === "SUBMITTED").length,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
  });

  const requests = cycle.requests.map((r) =>
    ReviewRequestSchema.parse({
      id: r.id,
      cycleId: r.cycleId,
      cycleName: cycle.name,
      cycleStatus: cycle.status,
      subjectId: r.subjectId ?? null,
      subjectName: r.subject?.name ?? null,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt,
    }),
  );

  return { ...parsedCycle, requests };
}

export async function getMyReviewRequests(reviewerPersonId?: string): Promise<ReviewRequest[]> {
  const sessionId = await getDemoSessionId();

  if (!reviewerPersonId) return [];

  const requests = await prisma.reviewRequest.findMany({
    where: {
      reviewerId: reviewerPersonId,
      status: "PENDING",
      sessionId,
      cycle: { status: "OPEN", deletedAt: null, sessionId },
    },
    include: {
      cycle: { select: { name: true, status: true } },
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return requests.map((r) =>
    ReviewRequestSchema.parse({
      id: r.id,
      cycleId: r.cycleId,
      cycleName: r.cycle.name,
      cycleStatus: r.cycle.status,
      subjectId: r.subjectId ?? null,
      subjectName: r.subject?.name ?? null,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt,
    }),
  );
}

export async function getReviewRequestWithTemplate(requestId: string): Promise<{
  request: ReviewRequest;
  template: ReviewTemplate | null;
} | null> {
  const sessionId = await getDemoSessionId();

  const request = await prisma.reviewRequest.findFirst({
    where: { id: requestId, sessionId },
    include: {
      cycle: {
        include: {
          template: true,
        },
      },
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!request) return null;

  const parsedRequest = ReviewRequestSchema.parse({
    id: request.id,
    cycleId: request.cycleId,
    cycleName: request.cycle.name,
    cycleStatus: request.cycle.status,
    subjectId: request.subjectId ?? null,
    subjectName: request.subject?.name ?? null,
    reviewerId: request.reviewerId ?? null,
    reviewerName: request.reviewer?.name ?? null,
    type: request.type,
    status: request.status,
    createdAt: request.createdAt,
  });

  const template = request.cycle.template
    ? ReviewTemplateSchema.parse({
        ...request.cycle.template,
        questions: Array.isArray(request.cycle.template.questions)
          ? request.cycle.template.questions
          : [],
      })
    : null;

  return { request: parsedRequest, template };
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  const sessionId = await getDemoSessionId();
  const types = await prisma.leaveType.findMany({
    where: { deletedAt: null, sessionId },
    orderBy: { name: "asc" },
  });

  return types.map((t) =>
    LeaveTypeSchema.parse({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      defaultDays: t.defaultDays,
      color: t.color,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }),
  );
}

export async function getLeaveRequests(filters?: {
  personId?: string;
  status?: string;
}): Promise<LeaveRequest[]> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) throw new Error("Permission denied");

  const sessionId = await getDemoSessionId();
  const where: Record<string, unknown> = { deletedAt: null, sessionId };
  if (filters?.personId) where.personId = filters.personId;
  if (filters?.status) where.status = filters.status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true, color: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) =>
    LeaveRequestSchema.parse({
      id: r.id,
      personId: r.personId,
      personName: r.person.name,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveType.name,
      leaveTypeColor: r.leaveType.color,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      note: r.note ?? null,
      status: r.status,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      reviewNote: r.reviewNote ?? null,
      reviewedAt: r.reviewedAt ?? null,
      createdAt: r.createdAt,
    }),
  );
}

export async function getLeaveBalances(filters?: {
  personId?: string;
  year?: number;
}): Promise<LeaveBalance[]> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) throw new Error("Permission denied");

  const sessionId = await getDemoSessionId();
  const where: Record<string, unknown> = { sessionId };
  if (filters?.personId) where.personId = filters.personId;
  if (filters?.year) where.year = filters.year;

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true, color: true } },
    },
    orderBy: [{ person: { name: "asc" } }, { leaveType: { name: "asc" } }],
  });

  return balances.map((b) =>
    LeaveBalanceSchema.parse({
      id: b.id,
      personId: b.personId,
      personName: b.person.name,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: b.leaveType.name,
      leaveTypeColor: b.leaveType.color,
      year: b.year,
      allocated: b.allocated,
      used: b.used,
      remaining: b.allocated - b.used,
    }),
  );
}

export async function getEmployeeProfile(id: string): Promise<EmployeeProfile | null> {
  const sessionId = await getDemoSessionId();
  const person = await prisma.person.findFirst({
    where: { id, deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    include: {
      teams: {
        where: { deletedAt: null, team: { deletedAt: null } },
        include: {
          team: { select: { teamId: true, teamName: true } },
        },
      },
      managedTeams: {
        where: { deletedAt: null, sessionId },
        select: { teamId: true, teamName: true },
      },
      headOfDepartments: {
        where: { deletedAt: null, sessionId },
        select: { id: true, name: true },
      },
    },
  });

  if (!person) return null;

  return EmployeeProfileSchema.parse({
    id: person.id,
    name: person.name,
    position: person.position,
    email: person.email,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    teams: person.teams.map((tm) => ({
      teamId: tm.team.teamId,
      teamName: tm.team.teamName,
    })),
    managedTeams: person.managedTeams.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
    })),
    headOfDepartments: person.headOfDepartments.map((d) => ({
      id: d.id,
      name: d.name,
    })),
  });
}

export async function getOrgChartData(): Promise<OrgChartData> {
  const sessionId = await getDemoSessionId();

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

export async function getPersonDeleteImpact(personId: string): Promise<PersonDeleteImpact> {
  const sessionId = await getDemoSessionId();
  const [managedTeams, headedDepartments, teamMemberships, leaveRequests, reviewRequests] =
    await Promise.all([
      prisma.team.findMany({
        where: { teamManagerId: personId, deletedAt: null, sessionId },
        select: { teamId: true, teamName: true },
      }),
      prisma.department.findMany({
        where: { headId: personId, deletedAt: null, sessionId },
        select: { id: true, name: true },
      }),
      prisma.teamMember.findMany({
        where: { personId, deletedAt: null, sessionId },
        select: { team: { select: { teamId: true, teamName: true } } },
      }),
      prisma.leaveRequest.count({
        where: { personId, deletedAt: null, sessionId },
      }),
      prisma.reviewRequest.count({
        where: {
          OR: [{ subjectId: personId }, { reviewerId: personId }],
          sessionId,
        },
      }),
    ]);

  return {
    managedTeams: managedTeams.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
    headedDepartments: headedDepartments.map((d) => ({ id: d.id, name: d.name })),
    teamMemberships: teamMemberships.map((tm) => ({
      teamId: tm.team.teamId,
      teamName: tm.team.teamName,
    })),
    leaveRequests,
    reviewRequests,
  };
}

export async function getTeamDeleteImpact(teamId: string): Promise<TeamDeleteImpact> {
  const sessionId = await getDemoSessionId();
  const [memberCount, team] = await Promise.all([
    prisma.teamMember.count({
      where: { teamId, deletedAt: null, sessionId },
    }),
    prisma.team.findFirst({
      where: { teamId, deletedAt: null, sessionId },
      select: { department: { select: { name: true } } },
    }),
  ]);

  return {
    memberCount,
    departmentName: team?.department?.name ?? null,
  };
}

export async function getDepartmentDeleteImpact(
  departmentId: string,
): Promise<DepartmentDeleteImpact> {
  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { departmentId, deletedAt: null, sessionId },
    select: { teamId: true, teamName: true },
  });

  return {
    teams: teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
  };
}
