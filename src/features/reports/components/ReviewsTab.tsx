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
import type { ReviewCompletion } from "@/features/reports/schemas";
import {
  chartBoxStyles,
  chartTextStyles,
  tableCellStyles,
  tableHeaderStyles,
  type TranslationFn,
} from "./reportStyles";

interface ReviewsTabProps {
  data: ReviewCompletion[];
  t: TranslationFn;
}

export default function ReviewsTab({ data, t }: ReviewsTabProps) {
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
