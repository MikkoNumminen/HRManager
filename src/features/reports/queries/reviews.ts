import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { getDemoSessionId } from "@/demoSession";
import { cache } from "@/lib/cache";
import { ReviewCompletionSchema, type ReportFilters, type ReviewCompletion } from "../schemas";
import { CACHE_TTL } from "./_shared";

// Raw SQL result types (PgBouncer-compatible unnamed parameterized queries)
interface ReviewCompletionRow {
  cycleName: string;
  cycleStatus: string;
  totalRequests: number;
  submittedCount: number;
  completionPct: number;
}

// ── Review Completion Rates ─────────────────────────────────────────────

export async function getReviewCompletionRates(
  _filters?: ReportFilters,
): Promise<ReviewCompletion[]> {
  const allowed = await hasPermission("reports:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchReviewCompletionCached(sessionId);
}

const fetchReviewCompletionCached = cache(
  async (sessionId: string | null): Promise<ReviewCompletion[]> => {
    return fetchReviewCompletionUncached(sessionId);
  },
  ["reports-reviews"],
  { revalidate: CACHE_TTL, tags: ["reports"] },
);

async function fetchReviewCompletionUncached(
  sessionId: string | null,
): Promise<ReviewCompletion[]> {
  const rows = await prisma.$queryRaw<ReviewCompletionRow[]>`
    SELECT
      rc."name" AS "cycleName",
      rc."status"::text AS "cycleStatus",
      COUNT(rr.id)::int AS "totalRequests",
      COUNT(CASE WHEN rr."status" = 'SUBMITTED' THEN 1 END)::int AS "submittedCount",
      CASE WHEN COUNT(rr.id) > 0
        THEN ROUND(COUNT(CASE WHEN rr."status" = 'SUBMITTED' THEN 1 END)::numeric / COUNT(rr.id) * 100, 1)
        ELSE 0
      END::float AS "completionPct"
    FROM "ReviewCycle" rc
    LEFT JOIN "ReviewRequest" rr ON rr."cycleId" = rc.id
    WHERE rc."deletedAt" IS NULL
      AND rc."sessionId" IS NOT DISTINCT FROM ${sessionId}
    GROUP BY rc.id, rc."name", rc."status"
    ORDER BY rc."startDate" DESC
  `;

  return rows.map((r) =>
    ReviewCompletionSchema.parse({
      cycleName: r.cycleName,
      cycleStatus: r.cycleStatus,
      totalRequests: r.totalRequests ?? 0,
      submittedCount: r.submittedCount ?? 0,
      completionPct: r.completionPct ?? 0,
    }),
  );
}
