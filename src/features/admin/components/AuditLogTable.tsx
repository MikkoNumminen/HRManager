"use client";

import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { colors } from "@/muiStyles";
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

interface AuditLogTableProps {
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

function AuditLogTable({
  logs,
  total,
  currentPage,
  pageSize,
  userNames,
  entityTypeLabels,
  describeChanges,
  onPageChange,
  onRowsPerPageChange,
}: AuditLogTableProps) {
  const t = useTranslations("audit");

  return (
    <TableContainer component={Paper}>
      <Table sx={{ tableLayout: "fixed", width: "100%" }} aria-label="audit log table">
        <TableHead>
          <TableRow>
            <Tooltip title={t("tooltipTimestamp")} placement="top" arrow>
              <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help", width: "15%" }}>
                {t("columnTimestamp")}
              </TableCell>
            </Tooltip>
            <Tooltip title={t("tooltipUser")} placement="top" arrow>
              <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help", width: "18%" }}>
                {t("columnUser")}
              </TableCell>
            </Tooltip>
            <Tooltip title={t("tooltipAction")} placement="top" arrow>
              <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help", width: "9%" }}>
                {t("columnAction")}
              </TableCell>
            </Tooltip>
            <Tooltip title={t("tooltipType")} placement="top" arrow>
              <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help", width: "10%" }}>
                {t("columnType")}
              </TableCell>
            </Tooltip>
            <Tooltip title={t("tooltipChanges")} placement="top" arrow>
              <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help" }}>
                {t("columnChanges")}
              </TableCell>
            </Tooltip>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noEntries")}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell sx={{ whiteSpace: "nowrap", fontSize: { xs: "0.75rem", sm: "0.8rem" } }}>
                  {formatDate(log.createdAt)}
                </TableCell>
                <TableCell
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Tooltip title={log.userEmail ?? t("system")} placement="top" arrow>
                    <Typography
                      variant="body2"
                      sx={{
                        cursor: "help",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(log.userEmail && userNames[log.userEmail]) ?? log.userEmail ?? t("system")}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>{entityTypeLabels[log.entityType] ?? log.entityType}</TableCell>
                <TableCell>
                  <Tooltip
                    title={describeChanges(log.action, log.entityType, log.before, log.after)}
                    placement="top"
                    arrow
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        cursor: "help",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                      }}
                    >
                      {describeChanges(log.action, log.entityType, log.before, log.after)}
                    </Typography>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
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
    </TableContainer>
  );
}

export default memo(AuditLogTable);
