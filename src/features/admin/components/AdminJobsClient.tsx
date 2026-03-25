"use client";

import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { colors, smallButtonStyles, tableStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { enqueueCleanupJob, enqueueAuditExportJob } from "@/features/jobs/actions";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import type { JobStatusResponse } from "@/jobs/types";

interface AdminJobsClientProps {
  statuses: JobStatusResponse[];
}

function StatusChip({ label, count }: { label: string; count: number }) {
  const chipColor =
    count > 0
      ? label === "failed" || label === "expired"
        ? colors.error
        : label === "active"
          ? colors.success
          : colors.info
      : colors.slate400;

  return (
    <Chip
      label={`${count}`}
      size="small"
      sx={{
        color: chipColor,
        borderColor: chipColor,
        fontWeight: 600,
      }}
      variant="outlined"
    />
  );
}

export default function AdminJobsClient({ statuses }: AdminJobsClientProps) {
  const t = useTranslations("jobs");
  const _tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [isPending, startTransition] = useTransition();

  const handleRunCleanup = () => {
    startTransition(async () => {
      const result = await enqueueCleanupJob("all");
      if (result?.error) {
        showSnackbar(result.error);
        return;
      }
      showSnackbar(t("jobEnqueued"));
    });
  };

  const handleExportAudit = () => {
    startTransition(async () => {
      const result = await enqueueAuditExportJob({
        filters: {},
        format: "json",
      });
      if (result?.error) {
        showSnackbar(result.error);
        return;
      }
      showSnackbar(t("jobEnqueued"));
    });
  };

  return (
    <Box>
      {/* Action buttons */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<PlayArrowIcon />}
          onClick={handleRunCleanup}
          disabled={isPending}
          sx={smallButtonStyles}
          data-testid="run-cleanup-button"
        >
          {t("runCleanup")}
        </Button>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportAudit}
          disabled={isPending}
          sx={smallButtonStyles}
          data-testid="export-audit-button"
        >
          {t("exportAudit")}
        </Button>
      </Box>

      {/* Queue status table */}
      {statuses.length === 0 ? (
        <Typography sx={{ color: colors.slate400, py: 2 }}>{t("noJobs")}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: "transparent", boxShadow: 0 }}>
          <Table sx={tableStyles} aria-label={t("heading")}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate100, borderColor: colors.slate300 }}>
                  {t("queueName")}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: colors.slate100, borderColor: colors.slate300 }}
                >
                  {t("created")}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: colors.slate100, borderColor: colors.slate300 }}
                >
                  {t("active")}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: colors.slate100, borderColor: colors.slate300 }}
                >
                  {t("completed")}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: colors.slate100, borderColor: colors.slate300 }}
                >
                  {t("failed")}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: colors.slate100, borderColor: colors.slate300 }}
                >
                  {t("expired")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statuses.map((status) => (
                <TableRow
                  key={status.queueName}
                  sx={{ "&:hover": { backgroundColor: colors.rowHover } }}
                >
                  <TableCell sx={{ color: colors.slate100, borderColor: colors.slate300 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {status.queueName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: colors.slate300 }}>
                    <StatusChip label="created" count={status.counts.created} />
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: colors.slate300 }}>
                    <StatusChip label="active" count={status.counts.active} />
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: colors.slate300 }}>
                    <StatusChip label="completed" count={status.counts.completed} />
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: colors.slate300 }}>
                    <StatusChip label="failed" count={status.counts.failed} />
                  </TableCell>
                  <TableCell align="center" sx={{ borderColor: colors.slate300 }}>
                    <StatusChip label="expired" count={status.counts.expired} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
