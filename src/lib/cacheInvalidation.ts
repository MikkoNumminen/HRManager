import { revalidateTag, updateTag } from "next/cache";

// Tag constants — keep in sync with cache() calls in feature queries.
export const ORG_DATA_TAG = "org-data";
export const DASHBOARD_TAG = "dashboard";
export const ORG_CHART_TAG = "org-chart";

// Invalidate all dashboard caches (metrics + org chart) AND the org-wide
// data caches (persons, teams, departments, positions). Called from any
// mutation that affects persons, teams, departments, positions, or users.
//
// Uses updateTag (Next.js 16) so the same server action can read its own
// writes — the cache entry is invalidated synchronously for the current
// request rather than scheduled for the next one.
export function invalidateDashboardCache(): void {
  updateTag(DASHBOARD_TAG);
  updateTag(ORG_DATA_TAG);
}

// Invalidate org chart specifically (also invalidated by "dashboard" tag).
export function invalidateOrgChartCache(): void {
  updateTag(ORG_CHART_TAG);
}

// Invalidate only the org-wide entity caches without touching dashboard
// metrics. Useful for mutations that change persons/teams/departments/positions
// but don't affect dashboard counts (e.g. renames).
export function invalidateOrgCache(): void {
  updateTag(ORG_DATA_TAG);
}

// Background revalidation variant — schedules a refresh for the next request
// instead of read-your-own-writes. Use from non-server-action contexts
// (background jobs, webhooks, route handlers) where the "max" profile is
// required by Next.js 16.
export function revalidateDashboardBackground(): void {
  revalidateTag(DASHBOARD_TAG, "max");
  revalidateTag(ORG_DATA_TAG, "max");
}
