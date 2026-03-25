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
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { tableStyles, textFieldStyles, formStyles, smallButtonStyles, colors } from "@/muiStyles";
import { useSnackbar } from "../SnackbarProvider";
import { useTranslations } from "next-intl";
import type { LeaveType } from "@/schemas";
import { createLeaveType, updateLeaveType, deleteLeaveType } from "@/serverActions";

interface LeaveTypesTabProps {
  leaveTypes: LeaveType[];
  canManageTypes: boolean;
}

export default function LeaveTypesTab({ leaveTypes, canManageTypes }: LeaveTypesTabProps) {
  const t = useTranslations("leave");
  const tn = useTranslations("leaveNotifications");
  const { showSnackbar } = useSnackbar();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await createLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeCreated"));
        setShowCreateForm(false);
      }
      return result;
    },
    undefined,
  );

  const [editState, editAction, editPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await updateLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeUpdated"));
        setEditId(null);
      }
      return result;
    },
    undefined,
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeDeleted"));
      } else {
        showSnackbar(result.error);
      }
      setDeleteDialogId(null);
    });
  }

  return (
    <>
      {canManageTypes && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ ...smallButtonStyles, mb: 2 }}
          onClick={() => setShowCreateForm(true)}
        >
          {t("createLeaveType")}
        </Button>
      )}

      {showCreateForm && (
        <Box component="form" action={createAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("createLeaveType")}
          </Typography>
          <TextField
            name="name"
            label={t("enterName")}
            size="small"
            required
            sx={textFieldStyles}
          />
          <TextField
            name="description"
            label={t("enterDescription")}
            size="small"
            multiline
            rows={2}
            sx={textFieldStyles}
          />
          <TextField
            name="defaultDays"
            label={t("defaultDays")}
            type="number"
            size="small"
            defaultValue={0}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={textFieldStyles}
          />
          <TextField
            name="color"
            label={t("color")}
            type="color"
            size="small"
            defaultValue="#1976d2"
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
              {t("createLeaveType")}
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

      {leaveTypes.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noLeaveTypes")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("enterName")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("enterDescription")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("defaultDays")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("color")}</TableCell>
                {canManageTypes && (
                  <TableCell sx={{ color: colors.slate400 }}>{t("actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((lt) =>
                editId === lt.id ? (
                  <TableRow key={lt.id}>
                    <TableCell colSpan={5}>
                      <Box
                        component="form"
                        action={editAction}
                        sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                      >
                        <input type="hidden" name="id" value={lt.id} />
                        <TextField
                          name="name"
                          defaultValue={lt.name}
                          size="small"
                          required
                          sx={{ ...textFieldStyles, flex: 1, minWidth: 120 }}
                        />
                        <TextField
                          name="description"
                          defaultValue={lt.description ?? ""}
                          size="small"
                          sx={{ ...textFieldStyles, flex: 2, minWidth: 150 }}
                        />
                        <TextField
                          name="defaultDays"
                          type="number"
                          defaultValue={lt.defaultDays}
                          size="small"
                          slotProps={{ htmlInput: { min: 0 } }}
                          sx={{ ...textFieldStyles, width: 80 }}
                        />
                        <TextField
                          name="color"
                          type="color"
                          defaultValue={lt.color}
                          size="small"
                          sx={{ ...textFieldStyles, width: 60 }}
                        />
                        {editState?.error && (
                          <Typography color="error" variant="body2" sx={{ width: "100%" }}>
                            {editState.error}
                          </Typography>
                        )}
                        <Button
                          type="submit"
                          variant="outlined"
                          sx={smallButtonStyles}
                          disabled={editPending}
                        >
                          {t("editLeaveType")}
                        </Button>
                        <Button
                          variant="outlined"
                          sx={smallButtonStyles}
                          onClick={() => setEditId(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={lt.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                    <TableCell sx={{ color: colors.slate100 }}>{lt.name}</TableCell>
                    <TableCell sx={{ color: colors.slate300 }}>{lt.description ?? "—"}</TableCell>
                    <TableCell sx={{ color: colors.slate100 }}>{lt.defaultDays}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "4px",
                          backgroundColor: lt.color,
                        }}
                      />
                    </TableCell>
                    {canManageTypes && (
                      <TableCell>
                        <IconButton
                          size="small"
                          sx={{ color: colors.slate300 }}
                          onClick={() => setEditId(lt.id)}
                          aria-label={t("editLeaveType")}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: colors.error }}
                          onClick={() => setDeleteDialogId(lt.id)}
                          aria-label={t("deleteLeaveType")}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!deleteDialogId} onClose={() => setDeleteDialogId(null)}>
        <DialogTitle>{t("deleteLeaveType")}</DialogTitle>
        <DialogContent>{t("deleteLeaveTypeConfirm")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogId(null)}>{t("cancel")}</Button>
          <Button color="error" onClick={() => deleteDialogId && handleDelete(deleteDialogId)}>
            {t("deleteLeaveType")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
