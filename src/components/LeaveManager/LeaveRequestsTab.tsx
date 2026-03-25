"use client";

import { useState, useTransition, useActionState } from "react";
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
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { tableStyles, textFieldStyles, formStyles, smallButtonStyles, colors } from "@/muiStyles";
import { useSnackbar } from "../SnackbarProvider";
import { useTranslations } from "next-intl";
import type { LeaveType, LeaveRequest, Person } from "@/schemas";
import { createLeaveRequest, reviewLeaveRequest, deleteLeaveRequest } from "@/serverActions";

interface LeaveRequestsTabProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  persons: Person[];
  canRequest: boolean;
  canApprove: boolean;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
}

function StatusChip({ status }: { status: string }) {
  const t = useTranslations("leave");
  const colorMap: Record<string, string> = {
    pending: colors.warning,
    approved: colors.success,
    rejected: colors.error,
  };
  const labelMap: Record<string, () => string> = {
    pending: () => t("statusPending"),
    approved: () => t("statusApproved"),
    rejected: () => t("statusRejected"),
  };
  return (
    <Chip
      label={labelMap[status]?.() ?? status}
      size="small"
      sx={{
        backgroundColor: colorMap[status] ?? colors.slate400,
        color: "#fff",
      }}
    />
  );
}

export default function LeaveRequestsTab({
  requests,
  leaveTypes,
  persons,
  canRequest,
  canApprove,
  statusFilter,
  onStatusFilter,
}: LeaveRequestsTabProps) {
  const t = useTranslations("leave");
  const tn = useTranslations("leaveNotifications");
  const { showSnackbar } = useSnackbar();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, startTransition] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await createLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(tn("requestCreated"));
        setShowCreateForm(false);
      }
      return result;
    },
    undefined,
  );

  function handleReview(id: string, action: "approved" | "rejected") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("action", action);
      const result = await reviewLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(action === "approved" ? tn("requestApproved") : tn("requestRejected"));
      } else {
        showSnackbar(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(tn("requestCancelled"));
      } else {
        showSnackbar(result.error);
      }
    });
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {canRequest && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={smallButtonStyles}
            onClick={() => setShowCreateForm(true)}
          >
            {t("createRequest")}
          </Button>
        )}
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          inputProps={{ "aria-label": t("statusFilter") }}
          sx={{ ...textFieldStyles, minWidth: 140 }}
        >
          <MenuItem value="all">{t("filterAll")}</MenuItem>
          <MenuItem value="pending">{t("filterPending")}</MenuItem>
          <MenuItem value="approved">{t("filterApproved")}</MenuItem>
          <MenuItem value="rejected">{t("filterRejected")}</MenuItem>
        </TextField>
      </Box>

      {showCreateForm && (
        <Box component="form" action={createAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("createRequest")}
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
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              name="startDate"
              label={t("startDate")}
              type="date"
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ ...textFieldStyles, flex: 1 }}
            />
            <TextField
              name="endDate"
              label={t("endDate")}
              type="date"
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ ...textFieldStyles, flex: 1 }}
            />
          </Box>
          <TextField
            name="days"
            label={t("days")}
            type="number"
            size="small"
            required
            slotProps={{ htmlInput: { min: 1 } }}
            sx={textFieldStyles}
          />
          <TextField
            name="note"
            label={t("note")}
            size="small"
            multiline
            rows={2}
            sx={textFieldStyles}
          />
          {createState?.error && (
            <Typography color="error" variant="body2">
              {createState.error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              sx={smallButtonStyles}
              disabled={createPending}
            >
              {t("createRequest")}
            </Button>
            <Button
              variant="outlined"
              sx={smallButtonStyles}
              onClick={() => setShowCreateForm(false)}
            >
              {t("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {requests.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noRequests")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("person")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("leaveType")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("period")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("days")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("status")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("reviewer")}</TableCell>
                {(canApprove || canRequest) && (
                  <TableCell sx={{ color: colors.slate400 }}>{t("actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                  <TableCell sx={{ color: colors.slate100 }}>{r.personName}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.leaveTypeName}
                      size="small"
                      sx={{ backgroundColor: r.leaveTypeColor, color: "#fff" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>
                    {new Date(r.startDate).toLocaleDateString()} –{" "}
                    {new Date(r.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{r.days}</TableCell>
                  <TableCell>
                    <StatusChip status={r.status} />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate300 }}>{r.reviewerName ?? "—"}</TableCell>
                  {(canApprove || canRequest) && (
                    <TableCell>
                      {r.status === "pending" && canApprove && (
                        <>
                          <IconButton
                            size="small"
                            sx={{ color: colors.success }}
                            onClick={() => handleReview(r.id, "approved")}
                            aria-label={t("approve")}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ color: colors.error }}
                            onClick={() => handleReview(r.id, "rejected")}
                            aria-label={t("reject")}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {r.status === "pending" && canRequest && (
                        <IconButton
                          size="small"
                          sx={{ color: colors.slate300 }}
                          onClick={() => handleDelete(r.id)}
                          aria-label={t("cancel")}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
