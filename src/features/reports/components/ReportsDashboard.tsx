"use client";

import { memo, useState, useMemo, useCallback } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { colors, pageContainerStyles, textFieldStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import type {
  HeadcountTrend,
  TurnoverRate,
  LeaveUtilization,
  ReviewCompletion,
} from "@/features/reports/schemas";
import DownloadIcon from "@mui/icons-material/Download";

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

const chartBoxStyles = {
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  padding: { xs: "16px", sm: "20px" },
};

const chartTextStyles = {
  style: {
    fill: "var(--hrm-slate300)",
    fontSize: 12,
  },
};

const tableCellStyles = {
  color: colors.slate300,
  borderBottom: `1px solid ${colors.hoverOverlay}`,
};

const tableHeaderStyles = {
  ...tableCellStyles,
  color: colors.slate100,
  fontWeight: 600,
};

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationFn = any;

function HeadcountTab({
  data,
  t,
}: {
  data: { months: string[]; depts: string[]; data: HeadcountTrend[] };
  t: TranslationFn;
}) {
  if (data.data.length === 0) {
    return (
      <Typography sx={{ color: colors.slate400, py: 4, textAlign: "center" }}>
        {t("noData")}
      </Typography>
    );
  }

  const series = data.depts.map((dept, i) => ({
    data: data.months.map(
      (m) =>
        data.data.find((r) => r.month === m && r.departmentName === dept)?.runningHeadcount ?? 0,
    ),
    label: dept,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <>
      <Box sx={chartBoxStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("headcountOverTime")}
        </Typography>
        <LineChart
          xAxis={[{ scaleType: "band", data: data.months, tickLabelStyle: chartTextStyles.style }]}
          yAxis={[{ tickLabelStyle: chartTextStyles.style }]}
          series={series}
          height={300}
          sx={{ "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" } }}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyles}>{t("month")}</TableCell>
                <TableCell sx={tableHeaderStyles}>{t("department")}</TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("hired")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("departed")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("runningHeadcount")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={tableCellStyles}>{r.month}</TableCell>
                  <TableCell sx={tableCellStyles}>{r.departmentName}</TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.hired}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.departed}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.runningHeadcount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

function TurnoverTab({
  data,
  t,
}: {
  data: { months: string[]; depts: string[]; data: TurnoverRate[] };
  t: TranslationFn;
}) {
  if (data.data.length === 0) {
    return (
      <Typography sx={{ color: colors.slate400, py: 4, textAlign: "center" }}>
        {t("noData")}
      </Typography>
    );
  }

  const series = data.depts.map((dept, i) => ({
    data: data.months.map(
      (m) => data.data.find((r) => r.month === m && r.departmentName === dept)?.turnoverPct ?? 0,
    ),
    label: dept,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <>
      <Box sx={chartBoxStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("turnoverOverTime")}
        </Typography>
        <BarChart
          xAxis={[{ scaleType: "band", data: data.months, tickLabelStyle: chartTextStyles.style }]}
          yAxis={[{ tickLabelStyle: chartTextStyles.style }]}
          series={series}
          height={300}
          sx={{ "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" } }}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyles}>{t("month")}</TableCell>
                <TableCell sx={tableHeaderStyles}>{t("department")}</TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("startCount")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("departedCount")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("turnoverPct")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={tableCellStyles}>{r.month}</TableCell>
                  <TableCell sx={tableCellStyles}>{r.departmentName}</TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.startCount}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.departedCount}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.turnoverPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

function LeaveTab({
  data,
  t,
}: {
  data: { deptNames: string[]; leaveTypes: string[]; data: LeaveUtilization[] };
  t: TranslationFn;
}) {
  if (data.data.length === 0) {
    return (
      <Typography sx={{ color: colors.slate400, py: 4, textAlign: "center" }}>
        {t("noData")}
      </Typography>
    );
  }

  const series = data.leaveTypes.map((lt, i) => ({
    data: data.deptNames.map(
      (dept) =>
        data.data.find((r) => r.departmentName === dept && r.leaveTypeName === lt)?.totalUsed ?? 0,
    ),
    label: lt,
    stack: "leave",
    color:
      data.data.find((r) => r.leaveTypeName === lt)?.leaveTypeColor ??
      CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <>
      <Box sx={chartBoxStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("leaveByDepartment")}
        </Typography>
        <BarChart
          xAxis={[
            { scaleType: "band", data: data.deptNames, tickLabelStyle: chartTextStyles.style },
          ]}
          yAxis={[{ tickLabelStyle: chartTextStyles.style }]}
          series={series}
          height={300}
          sx={{ "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" } }}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyles}>{t("department")}</TableCell>
                <TableCell sx={tableHeaderStyles}>{t("leaveType")}</TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("allocated")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("used")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("remaining")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("utilizationPct")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={tableCellStyles}>{r.departmentName}</TableCell>
                  <TableCell sx={tableCellStyles}>{r.leaveTypeName}</TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.totalAllocated}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.totalUsed}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.totalRemaining}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.utilizationPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

function ReviewsTab({ data, t }: { data: ReviewCompletion[]; t: TranslationFn }) {
  if (data.length === 0) {
    return (
      <Typography sx={{ color: colors.slate400, py: 4, textAlign: "center" }}>
        {t("noData")}
      </Typography>
    );
  }

  return (
    <>
      <Box sx={chartBoxStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("reviewCompletionByC")}
        </Typography>
        <BarChart
          xAxis={[
            {
              scaleType: "band",
              data: data.map((r) => r.cycleName),
              tickLabelStyle: chartTextStyles.style,
            },
          ]}
          yAxis={[{ tickLabelStyle: chartTextStyles.style, max: 100 }]}
          series={[
            {
              data: data.map((r) => r.completionPct),
              label: t("completionPct"),
              color: "var(--hrm-info)",
            },
          ]}
          height={300}
          sx={{ "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" } }}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyles}>{t("cycleName")}</TableCell>
                <TableCell sx={tableHeaderStyles}>{t("cycleStatus")}</TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("totalRequests")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("submitted")}
                </TableCell>
                <TableCell sx={tableHeaderStyles} align="right">
                  {t("completionPct")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell sx={tableCellStyles}>{r.cycleName}</TableCell>
                  <TableCell sx={tableCellStyles}>{r.cycleStatus}</TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.totalRequests}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.submittedCount}
                  </TableCell>
                  <TableCell sx={tableCellStyles} align="right">
                    {r.completionPct}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

const CHART_COLORS = [
  "var(--hrm-info)",
  "var(--hrm-success)",
  "var(--hrm-warning)",
  "#ab47bc",
  "#ef5350",
  "#26c6da",
  "#ff7043",
  "#66bb6a",
];

export default memo(ReportsDashboard);
