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
import type { TurnoverRate } from "@/features/reports/schemas";
import {
  chartBoxStyles,
  chartTextStyles,
  tableCellStyles,
  tableHeaderStyles,
  CHART_COLORS,
  type TranslationFn,
} from "./reportStyles";

interface TurnoverTabProps {
  data: { months: string[]; depts: string[]; data: TurnoverRate[] };
  t: TranslationFn;
}

export default function TurnoverTab({ data, t }: TurnoverTabProps) {
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
