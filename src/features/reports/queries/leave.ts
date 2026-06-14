import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { cache } from "@/lib/cache";
import { LeaveUtilizationSchema, type ReportFilters, type LeaveUtilization } from "../schemas";
import { CACHE_TTL } from "./_shared";

// Raw SQL result types (PgBouncer-compatible unnamed parameterized queries)
interface LeaveUtilizationRow {
  departmentName: string;
  leaveTypeName: string;
  leaveTypeColor: string;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  utilizationPct: number;
}

// ── Leave Utilization ───────────────────────────────────────────────────

export async function getLeaveUtilization(filters?: ReportFilters): Promise<LeaveUtilization[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const year = filters?.year ?? new Date().getFullYear();
  return fetchLeaveUtilizationCached(sessionId, filters?.departmentId ?? null, year);
}

const fetchLeaveUtilizationCached = cache(
  async (
    sessionId: string | null,
    departmentId: string | null,
    year: number,
  ): Promise<LeaveUtilization[]> => {
    return fetchLeaveUtilizationUncached(sessionId, departmentId, year);
  },
  ["reports-leave"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchLeaveUtilizationUncached(
  sessionId: string | null,
  departmentId: string | null,
  year: number,
): Promise<LeaveUtilization[]> {
  const rows = await prisma.$queryRaw<LeaveUtilizationRow[]>`
    SELECT
      COALESCE(dept."name", 'Unassigned') AS "departmentName",
      lt."name" AS "leaveTypeName",
      lt."color" AS "leaveTypeColor",
      SUM(lb."allocated")::int AS "totalAllocated",
      SUM(lb."used")::int AS "totalUsed",
      SUM(lb."allocated" - lb."used")::int AS "totalRemaining",
      CASE WHEN SUM(lb."allocated") > 0
        THEN ROUND(SUM(lb."used")::numeric / SUM(lb."allocated") * 100, 1)
        ELSE 0
      END::float AS "utilizationPct"
    FROM "LeaveBalance" lb
    JOIN "LeaveType" lt ON lt.id = lb."leaveTypeId" AND lt."deletedAt" IS NULL
    JOIN "Person" p ON p.id = lb."personId" AND p."deletedAt" IS NULL AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."deletedAt" IS NULL AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."deletedAt" IS NULL AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
    LEFT JOIN "Department" dept ON dept.id = t."departmentId" AND dept."deletedAt" IS NULL AND dept."sessionId" IS NOT DISTINCT FROM ${sessionId}
    WHERE lb."year" = ${year}
      AND lb."sessionId" IS NOT DISTINCT FROM ${sessionId}
      AND (${departmentId}::text IS NULL OR dept.id = ${departmentId})
    GROUP BY "departmentName", lt."name", lt."color"
    ORDER BY "departmentName" ASC, lt."name" ASC
  `;

  return rows.map((r) =>
    LeaveUtilizationSchema.parse({
      departmentName: r.departmentName,
      leaveTypeName: r.leaveTypeName,
      leaveTypeColor: r.leaveTypeColor,
      totalAllocated: r.totalAllocated ?? 0,
      totalUsed: r.totalUsed ?? 0,
      totalRemaining: r.totalRemaining ?? 0,
      utilizationPct: r.utilizationPct ?? 0,
    }),
  );
}
