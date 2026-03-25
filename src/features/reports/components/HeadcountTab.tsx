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
import { LineChart } from "@mui/x-charts/LineChart";
import { colors } from "@/muiStyles";
import type { HeadcountTrend } from "@/features/reports/schemas";
import {
  chartBoxStyles,
  chartTextStyles,
  tableCellStyles,
  tableHeaderStyles,
  CHART_COLORS,
  type TranslationFn,
} from "./reportStyles";

interface HeadcountTabProps {
  data: { months: string[]; depts: string[]; data: HeadcountTrend[] };
  t: TranslationFn;
}

export default function HeadcountTab({ data, t }: HeadcountTabProps) {
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
