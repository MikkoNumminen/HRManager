"use client";

import { LeaveBalance, LeaveRequest } from "@/schemas";
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
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

interface EmployeeLeaveClientProps {
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
}

const STATUS_COLORS: Record<string, "success" | "warning" | "error"> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
};

export default function EmployeeLeaveClient({
  leaveBalances,
  leaveRequests,
}: EmployeeLeaveClientProps) {
  const t = useTranslations("employee");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Alert severity="info">{t("readOnly")}</Alert>

      {/* Leave balances */}
      <Box sx={formStyles}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <AccountBalanceWalletIcon sx={{ color: colors.slate300 }} />
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("leaveBalance")} ({new Date().getFullYear()})
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.slate300, mb: 1.5 }} />

        {leaveBalances.length === 0 ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("noLeaveBalance")}
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("leaveType")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: colors.slate400, borderColor: colors.slate300 }}
                  >
                    {t("allocated")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: colors.slate400, borderColor: colors.slate300 }}
                  >
                    {t("used")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: colors.slate400, borderColor: colors.slate300 }}
                  >
                    {t("remaining")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveBalances.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell sx={{ color: colors.slate100, borderColor: colors.slate300 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: b.leaveTypeColor,
                            flexShrink: 0,
                          }}
                        />
                        {b.leaveTypeName}
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: colors.slate300, borderColor: colors.slate300 }}
                    >
                      {b.allocated}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: colors.slate300, borderColor: colors.slate300 }}
                    >
                      {b.used}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: b.remaining > 0 ? colors.green400 : colors.error,
                        borderColor: colors.slate300,
                        fontWeight: 600,
                      }}
                    >
                      {b.remaining}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Leave request history */}
      <Box sx={formStyles}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <BeachAccessIcon sx={{ color: colors.slate300 }} />
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("leaveHistory")}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.slate300, mb: 1.5 }} />

        {leaveRequests.length === 0 ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("noLeaveRequests")}
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("leaveType")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("period")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: colors.slate400, borderColor: colors.slate300 }}
                  >
                    {t("days")}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate400, borderColor: colors.slate300 }}>
                    {t("status")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ color: colors.slate100, borderColor: colors.slate300 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: r.leaveTypeColor,
                            flexShrink: 0,
                          }}
                        />
                        {r.leaveTypeName}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: colors.slate300, borderColor: colors.slate300 }}>
                      {new Date(r.startDate).toLocaleDateString()} –{" "}
                      {new Date(r.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: colors.slate300, borderColor: colors.slate300 }}
                    >
                      {r.days}
                    </TableCell>
                    <TableCell sx={{ borderColor: colors.slate300 }}>
                      <Chip
                        label={t(`leaveStatus_${r.status}`)}
                        size="small"
                        color={STATUS_COLORS[r.status] ?? "default"}
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
