"use client";

import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { colors } from "@/muiStyles";
import type { LeaveUtilization } from "@/features/reports/schemas";
import {
  chartBoxStyles,
  chartTextStyles,
  tableCellStyles,
  tableHeaderStyles,
  CHART_COLORS,
  type TranslationFn,
} from "./reportStyles";

interface LeaveTabProps {
  data: { deptNames: string[]; leaveTypes: string[]; data: LeaveUtilization[] };
  t: TranslationFn;
}

export default function LeaveTab({ data, t }: LeaveTabProps) {
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
              {data.data.map((r) => (
                <TableRow key={`${r.departmentName}-${r.leaveTypeName}`}>
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
