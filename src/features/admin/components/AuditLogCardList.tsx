"use client";

import { Box, Chip, TablePagination, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { colors, mobileCardStyles } from "@/muiStyles";
import { formatDate } from "@/utils/formatDate";
import { AuditLog } from "@/schemas";

const actionColors: Record<string, string> = {
  create: colors.success,
  update: colors.info,
  delete: colors.error,
  seed: colors.warning,
  reset: colors.warning,
  permission_denied: colors.error,
  rate_limited: colors.error,
  import: colors.info,
  export: colors.slate300,
};

interface AuditLogCardListProps {
  logs: AuditLog[];
  total: number;
  currentPage: number;
  pageSize: number;
  userNames: Record<string, string>;
  entityTypeLabels: Record<string, string>;
  describeChanges: (
    action: string,
    entityType: string,
    before: string | null,
    after: string | null,
  ) => string;
  onPageChange: (_: unknown, newPage: number) => void;
  onRowsPerPageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function AuditLogCardList({
  logs,
  total,
  currentPage,
  pageSize,
  userNames,
  entityTypeLabels,
  describeChanges,
  onPageChange,
  onRowsPerPageChange,
}: AuditLogCardListProps) {
  const t = useTranslations("audit");

  if (logs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100px">
        <Typography align="center">{t("noEntries")}</Typography>
      </Box>
    );
  }

  return (
    <>
      {logs.map((log) => (
        <Box key={log.id} sx={mobileCardStyles}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Chip
              label={log.action}
              size="small"
              sx={{
                color: actionColors[log.action] ?? colors.slate300,
                borderColor: actionColors[log.action] ?? colors.slate300,
                fontWeight: 600,
                textTransform: "capitalize",
              }}
              variant="outlined"
            />
            <Typography variant="caption" sx={{ color: colors.slate400 }}>
              {entityTypeLabels[log.entityType] ?? log.entityType}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: colors.slate100, mb: 0.5, wordBreak: "break-word" }}
          >
            {describeChanges(log.action, log.entityType, log.before, log.after)}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.slate400 }}>
            {(log.userEmail && userNames[log.userEmail]) ?? log.userEmail ?? t("system")}
            {" · "}
            {formatDate(log.createdAt)}
          </Typography>
        </Box>
      ))}
      <TablePagination
        component="div"
        count={total}
        page={currentPage - 1}
        onPageChange={onPageChange}
        rowsPerPage={pageSize}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{ color: colors.slate300 }}
      />
    </>
  );
}

export default memo(AuditLogCardList);
