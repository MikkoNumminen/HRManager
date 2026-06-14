import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { cache } from "@/lib/cache";
import { TurnoverRateSchema, type ReportFilters, type TurnoverRate } from "../schemas";
import { CACHE_TTL } from "./_shared";

// Raw SQL result types (PgBouncer-compatible unnamed parameterized queries)
interface TurnoverRateRow {
  month: string;
  departmentName: string;
  startCount: number;
  departedCount: number;
  turnoverPct: number;
}

// ── Turnover Rates ──────────────────────────────────────────────────────

export async function getTurnoverRates(filters?: ReportFilters): Promise<TurnoverRate[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchTurnoverRatesCached(
    sessionId,
    filters?.departmentId ?? null,
    filters?.dateFrom ?? null,
    filters?.dateTo ?? null,
  );
}

const fetchTurnoverRatesCached = cache(
  async (
    sessionId: string | null,
    departmentId: string | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<TurnoverRate[]> => {
    return fetchTurnoverRatesUncached(sessionId, departmentId, dateFrom, dateTo);
  },
  ["reports-turnover"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchTurnoverRatesUncached(
  sessionId: string | null,
  departmentId: string | null,
  dateFrom: Date | null,
  dateTo: Date | null,
): Promise<TurnoverRate[]> {
  const rows = await prisma.$queryRaw<TurnoverRateRow[]>`
    WITH months AS (
      SELECT DISTINCT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        COALESCE(${dateFrom}::timestamptz, NOW() - INTERVAL '12 months'),
        COALESCE(${dateTo}::timestamptz, NOW()),
        '1 month'
      ) d
    ),
    dept_list AS (
      SELECT COALESCE(d."name", 'Unassigned') AS "departmentName", d.id AS dept_id
      FROM "Department" d
      WHERE d."deletedAt" IS NULL
        AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
    ),
    start_counts AS (
      SELECT
        m.month,
        dl."departmentName",
        COUNT(p.id)::int AS "startCount"
      FROM months m
      CROSS JOIN dept_list dl
      LEFT JOIN "Team" t ON t."departmentId" = dl.dept_id AND t."deletedAt" IS NULL AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "TeamMember" tm ON tm."teamId" = t."teamId" AND tm."deletedAt" IS NULL AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Person" p ON p.id = tm."personId"
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND p."createdAt" < (m.month || '-01')::date
        AND (p."deletedAt" IS NULL OR p."deletedAt" >= (m.month || '-01')::date)
      GROUP BY m.month, dl."departmentName"
    ),
    departure_counts AS (
      SELECT
        to_char(p."deletedAt", 'YYYY-MM') AS month,
        COALESCE(d."name", 'Unassigned') AS "departmentName",
        COUNT(*)::int AS "departedCount"
      FROM "Person" p
      LEFT JOIN "TeamMember" tm ON tm."personId" = p.id AND tm."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Team" t ON t."teamId" = tm."teamId" AND t."sessionId" IS NOT DISTINCT FROM ${sessionId}
      LEFT JOIN "Department" d ON d.id = t."departmentId" AND d."sessionId" IS NOT DISTINCT FROM ${sessionId}
      WHERE p."deletedAt" IS NOT NULL
        AND p."sessionId" IS NOT DISTINCT FROM ${sessionId}
        AND (${departmentId}::text IS NULL OR d.id = ${departmentId})
        AND (${dateFrom}::timestamptz IS NULL OR p."deletedAt" >= ${dateFrom})
        AND (${dateTo}::timestamptz IS NULL OR p."deletedAt" <= ${dateTo})
      GROUP BY month, "departmentName"
    )
    SELECT
      sc.month,
      sc."departmentName",
      sc."startCount"::int,
      COALESCE(dc."departedCount", 0)::int AS "departedCount",
      CASE WHEN sc."startCount" > 0
        THEN ROUND(COALESCE(dc."departedCount", 0)::numeric / sc."startCount" * 100, 1)
        ELSE 0
      END::float AS "turnoverPct"
    FROM start_counts sc
    LEFT JOIN departure_counts dc
      ON sc.month = dc.month AND sc."departmentName" = dc."departmentName"
    ORDER BY sc.month ASC, sc."departmentName" ASC
  `;

  return rows.map((r) =>
    TurnoverRateSchema.parse({
      month: r.month,
      departmentName: r.departmentName,
      startCount: r.startCount ?? 0,
      departedCount: r.departedCount ?? 0,
      turnoverPct: r.turnoverPct ?? 0,
    }),
  );
}
