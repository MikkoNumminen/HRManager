"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { Autocomplete, Box, Button, Tab, Tabs, TextField } from "@mui/material";
import { colors, pageContainerStyles, textFieldStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import type {
  HeadcountTrend,
  TurnoverRate,
  LeaveUtilization,
  ReviewCompletion,
} from "@/features/reports/schemas";
import DownloadIcon from "@mui/icons-material/Download";
import HeadcountTab from "./HeadcountTab";
import TurnoverTab from "./TurnoverTab";
import LeaveTab from "./LeaveTab";
import ReviewsTab from "./ReviewsTab";

interface Department {
  id: string;
  name: string;
}

interface ReportsDashboardProps {
  headcountTrends: HeadcountTrend[];
  turnoverRates: TurnoverRate[];
  leaveUtilization: LeaveUtilization[];
  reviewCompletion: ReviewCompletion[];
  departments: Department[];
  canExport: boolean;
}

function ReportsDashboard({
  headcountTrends,
  turnoverRates,
  leaveUtilization,
  reviewCompletion,
  departments,
  canExport,
}: ReportsDashboardProps) {
  const t = useTranslations("reports");
  const [tab, setTab] = useState(0);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Client-side filtering
  const filteredHeadcount = useMemo(
    () =>
      selectedDept
        ? headcountTrends.filter((r) => r.departmentName === selectedDept.name)
        : headcountTrends,
    [headcountTrends, selectedDept],
  );

  const filteredTurnover = useMemo(
    () =>
      selectedDept
        ? turnoverRates.filter((r) => r.departmentName === selectedDept.name)
        : turnoverRates,
    [turnoverRates, selectedDept],
  );

  const filteredLeave = useMemo(
    () =>
      selectedDept
        ? leaveUtilization.filter((r) => r.departmentName === selectedDept.name)
        : leaveUtilization,
    [leaveUtilization, selectedDept],
  );

  // Build chart data for headcount line chart
  const headcountChartData = useMemo(() => {
    const months = [...new Set(filteredHeadcount.map((r) => r.month))].sort();
    const depts = [...new Set(filteredHeadcount.map((r) => r.departmentName))];
    return { months, depts, data: filteredHeadcount };
  }, [filteredHeadcount]);

  // Build chart data for turnover bar chart
  const turnoverChartData = useMemo(() => {
    const months = [...new Set(filteredTurnover.map((r) => r.month))].sort();
    const depts = [...new Set(filteredTurnover.map((r) => r.departmentName))];
    return { months, depts, data: filteredTurnover };
  }, [filteredTurnover]);

  // Build chart data for leave stacked bar chart
  const leaveChartData = useMemo(() => {
    const deptNames = [...new Set(filteredLeave.map((r) => r.departmentName))];
    const leaveTypes = [...new Set(filteredLeave.map((r) => r.leaveTypeName))];
    return { deptNames, leaveTypes, data: filteredLeave };
  }, [filteredLeave]);

  const handleExportCsv = useCallback(
    (reportType: string) => {
      let csvContent = "";
      let filename = "";

      if (reportType === "headcount") {
        const headers = [
          t("month"),
          t("department"),
          t("hired"),
          t("departed"),
          t("runningHeadcount"),
        ];
        const rows = filteredHeadcount.map((r) =>
          [r.month, r.departmentName, r.hired, r.departed, r.runningHeadcount].join(","),
        );
        csvContent = [headers.join(","), ...rows].join("\n");
        filename = "headcount-trends.csv";
      } else if (reportType === "turnover") {
        const headers = [
          t("month"),
          t("department"),
          t("startCount"),
          t("departedCount"),
          t("turnoverPct"),
        ];
        const rows = filteredTurnover.map((r) =>
          [r.month, r.departmentName, r.startCount, r.departedCount, r.turnoverPct].join(","),
        );
        csvContent = [headers.join(","), ...rows].join("\n");
        filename = "turnover-rates.csv";
      } else if (reportType === "leave") {
        const headers = [
          t("department"),
          t("leaveType"),
          t("allocated"),
          t("used"),
          t("remaining"),
          t("utilizationPct"),
        ];
        const rows = filteredLeave.map((r) =>
          [
            r.departmentName,
            r.leaveTypeName,
            r.totalAllocated,
            r.totalUsed,
            r.totalRemaining,
            r.utilizationPct,
          ].join(","),
        );
        csvContent = [headers.join(","), ...rows].join("\n");
        filename = "leave-utilization.csv";
      } else if (reportType === "reviews") {
        const headers = [
          t("cycleName"),
          t("cycleStatus"),
          t("totalRequests"),
          t("submitted"),
          t("completionPct"),
        ];
        const rows = reviewCompletion.map((r) =>
          [r.cycleName, r.cycleStatus, r.totalRequests, r.submittedCount, r.completionPct].join(
            ",",
          ),
        );
        csvContent = [headers.join(","), ...rows].join("\n");
        filename = "review-completion.csv";
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    [filteredHeadcount, filteredTurnover, filteredLeave, reviewCompletion, t],
  );

  const reportTypes = ["headcount", "turnover", "leave", "reviews"] as const;

  return (
    <Box sx={pageContainerStyles}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          "& .MuiTab-root": { color: colors.slate400 },
          "& .Mui-selected": { color: colors.slate100 },
          "& .MuiTabs-indicator": { backgroundColor: colors.info },
        }}
      >
        <Tab label={t("tabHeadcount")} />
        <Tab label={t("tabTurnover")} />
        <Tab label={t("tabLeave")} />
        <Tab label={t("tabReviews")} />
      </Tabs>

      {/* Filter Controls */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {tab !== 3 && (
          <Autocomplete
            options={departments}
            getOptionLabel={(o) => o.name}
            value={selectedDept}
            onChange={(_, v) => setSelectedDept(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("filterDepartment")}
                size="small"
                sx={{ ...textFieldStyles, minWidth: 200 }}
              />
            )}
            sx={{ minWidth: 200 }}
          />
        )}
        {tab === 2 && (
          <TextField
            label={t("filterYear")}
            type="number"
            size="small"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            sx={{ ...textFieldStyles, width: 120 }}
          />
        )}
        {canExport && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportCsv(reportTypes[tab])}
            sx={{
              color: colors.slate300,
              borderColor: colors.slate300,
              "&:hover": { backgroundColor: colors.hoverOverlay, borderColor: colors.slate300 },
              ml: "auto",
            }}
          >
            {t("exportCsv")}
          </Button>
        )}
      </Box>

      {/* Tab Content */}
      {tab === 0 && <HeadcountTab data={headcountChartData} t={t} />}
      {tab === 1 && <TurnoverTab data={turnoverChartData} t={t} />}
      {tab === 2 && <LeaveTab data={leaveChartData} t={t} />}
      {tab === 3 && <ReviewsTab data={reviewCompletion} t={t} />}
    </Box>
  );
}

export default memo(ReportsDashboard);
