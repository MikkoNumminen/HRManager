"use client";

import { useState, useActionState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { tableStyles, textFieldStyles, formStyles, smallButtonStyles, colors } from "@/muiStyles";
import { useSnackbar } from "../SnackbarProvider";
import { useTranslations } from "next-intl";
import type { LeaveType, LeaveBalance, Person } from "@/schemas";
import { allocateLeaveBalance } from "@/serverActions";

interface LeaveBalancesTabProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  persons: Person[];
  canManageTypes: boolean;
}

export default function LeaveBalancesTab({
  balances,
  leaveTypes,
  persons,
  canManageTypes,
}: LeaveBalancesTabProps) {
  const t = useTranslations("leave");
  const tn = useTranslations("leaveNotifications");
  const { showSnackbar } = useSnackbar();
  const [showAllocateForm, setShowAllocateForm] = useState(false);

  const [allocateState, allocateAction, allocatePending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await allocateLeaveBalance(formData);
      if (!result?.error) {
        showSnackbar(tn("balanceAllocated"));
        setShowAllocateForm(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      {canManageTypes && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ ...smallButtonStyles, mb: 2 }}
          onClick={() => setShowAllocateForm(true)}
        >
          {t("allocateBalance")}
        </Button>
      )}

      {showAllocateForm && (
        <Box component="form" action={allocateAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("allocateBalance")}
          </Typography>
          <TextField
            select
            name="personId"
            label={t("selectPerson")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {persons.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            name="leaveTypeId"
            label={t("selectLeaveType")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {leaveTypes.map((lt) => (
              <MenuItem key={lt.id} value={lt.id}>
                {lt.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="year"
            label={t("year")}
            type="number"
            size="small"
            defaultValue={new Date().getFullYear()}
            sx={textFieldStyles}
          />
          <TextField
            name="allocated"
            label={t("allocatedDays")}
            type="number"
            size="small"
            required
            slotProps={{ htmlInput: { min: 0 } }}
            sx={textFieldStyles}
          />
          {allocateState?.error && (
            <Typography color="error" variant="body2">
              {allocateState.error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              sx={smallButtonStyles}
              disabled={allocatePending}
            >
              {t("allocateBalance")}
            </Button>
            <Button
              variant="outlined"
              sx={smallButtonStyles}
              onClick={() => setShowAllocateForm(false)}
            >
              {t("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {balances.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noBalances")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("person")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("leaveType")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("year")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("allocated")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("used")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("remaining")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                  <TableCell sx={{ color: colors.slate100 }}>{b.personName}</TableCell>
                  <TableCell>
                    <Chip
                      label={b.leaveTypeName}
                      size="small"
                      sx={{ backgroundColor: b.leaveTypeColor, color: "#fff" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.year}</TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.allocated}</TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.used}</TableCell>
                  <TableCell
                    sx={{
                      color: b.remaining > 0 ? colors.success : colors.error,
                      fontWeight: "bold",
                    }}
                  >
                    {b.remaining}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
