"use client";

import { ReviewRequest } from "@/schemas";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { colors, formStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import AssessmentIcon from "@mui/icons-material/Assessment";

interface EmployeeReviewsClientProps {
  reviews: ReviewRequest[];
}

const CYCLE_STATUS_COLOR: Record<string, "default" | "success" | "warning"> = {
  OPEN: "success",
  DRAFT: "warning",
  CLOSED: "default",
};

const REVIEW_STATUS_COLOR: Record<string, "default" | "success" | "warning"> = {
  SUBMITTED: "success",
  PENDING: "warning",
};

const REVIEW_TYPE_COLOR: Record<string, "default" | "primary" | "secondary" | "info" | "warning"> =
  {
    SELF: "info",
    MANAGER: "primary",
    PEER: "secondary",
    DIRECT_REPORT: "warning",
  };

export default function EmployeeReviewsClient({ reviews }: EmployeeReviewsClientProps) {
  const t = useTranslations("employee");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert severity="info">{t("readOnly")}</Alert>

      <Box sx={formStyles}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AssessmentIcon sx={{ color: colors.slate300 }} />
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("reviews")}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.slate300, mb: 1.5 }} />

        {reviews.length === 0 ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("noReviews")}
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("reviewCycle")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("reviewType")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("reviewer")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("cycleStatus")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("status")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ color: colors.slate100, borderColor: colors.slate300 }}>
                      {r.cycleName}
                    </TableCell>
                    <TableCell sx={{ borderColor: colors.slate300 }}>
                      <Chip
                        label={t(`reviewType_${r.type}`)}
                        size="small"
                        color={REVIEW_TYPE_COLOR[r.type] ?? "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ color: colors.slate300, borderColor: colors.slate300 }}>
                      {r.reviewerName ?? t("reviewerUnassigned")}
                    </TableCell>
                    <TableCell sx={{ borderColor: colors.slate300 }}>
                      <Chip
                        label={t(`cycleStatus_${r.cycleStatus}`)}
                        size="small"
                        color={CYCLE_STATUS_COLOR[r.cycleStatus] ?? "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: colors.slate300 }}>
                      <Chip
                        label={t(`reviewStatus_${r.status}`)}
                        size="small"
                        color={REVIEW_STATUS_COLOR[r.status] ?? "default"}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
}
