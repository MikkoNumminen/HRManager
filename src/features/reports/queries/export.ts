import { ActionError } from "@/actionErrors";
import { hasPermission } from "@/permissions";
import { type ReportFilters } from "../schemas";
import { getHeadcountTrends } from "./headcount";
import { getTurnoverRates } from "./turnover";
import { getLeaveUtilization } from "./leave";
import { getReviewCompletionRates } from "./reviews";

// ── CSV Export ───────────────────────────────────────────────────────────

export type ReportType = "headcount" | "turnover" | "leave" | "reviews";

export async function exportReportCsv(
  reportType: ReportType,
  filters?: ReportFilters,
): Promise<string> {
  const allowed = await hasPermission("reports:export");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  switch (reportType) {
    case "headcount": {
      const data = await getHeadcountTrends(filters);
      return toCsv(
        ["Month", "Department", "Hired", "Departed", "Running Headcount"],
        data.map((r) => [r.month, r.departmentName, r.hired, r.departed, r.runningHeadcount]),
      );
    }
    case "turnover": {
      const data = await getTurnoverRates(filters);
      return toCsv(
        ["Month", "Department", "Start Count", "Departed", "Turnover %"],
        data.map((r) => [r.month, r.departmentName, r.startCount, r.departedCount, r.turnoverPct]),
      );
    }
    case "leave": {
      const data = await getLeaveUtilization(filters);
      return toCsv(
        ["Department", "Leave Type", "Allocated", "Used", "Remaining", "Utilization %"],
        data.map((r) => [
          r.departmentName,
          r.leaveTypeName,
          r.totalAllocated,
          r.totalUsed,
          r.totalRemaining,
          r.utilizationPct,
        ]),
      );
    }
    case "reviews": {
      const data = await getReviewCompletionRates(filters);
      return toCsv(
        ["Cycle", "Status", "Total Requests", "Submitted", "Completion %"],
        data.map((r) => [
          r.cycleName,
          r.cycleStatus,
          r.totalRequests,
          r.submittedCount,
          r.completionPct,
        ]),
      );
    }
  }
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}
