import { revalidateTag } from "next/cache";

// Invalidate all dashboard caches (metrics + org chart).
// Call this after any mutation that affects persons, teams, departments, or users.
export function invalidateDashboardCache(): void {
  revalidateTag("dashboard");
}

// Invalidate org chart specifically (also invalidated by "dashboard" tag).
export function invalidateOrgChartCache(): void {
  revalidateTag("org-chart");
}
