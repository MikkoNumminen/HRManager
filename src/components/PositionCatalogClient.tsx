"use client";

import { useState, useTransition, useActionState } from "react";
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  colors,
  formStyles,
  smallButtonStyles,
  activeButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";
import type { Position, Permissions } from "@/schemas";
import { createPositionEntry, deletePositionEntry } from "@/serverActions";

interface Props {
  positions: Position[];
  permissions: Permissions;
}

export default function PositionCatalogClient({ positions, permissions }: Props) {
  const t = useTranslations("positions");
  const tn = useTranslations("positionNotifications");
  const tc = useTranslations("common");
  const { showSnackbar } = useSnackbar();
  const canManage = permissions["position:manage"];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await createPositionEntry(formData);
      if (!result?.error) {
        showSnackbar(tn("positionCreated"));
        setShowCreateForm(false);
      }
      return result;
    },
    undefined,
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deletePositionEntry(formData);
      if (!result?.error) {
        showSnackbar(tn("positionDeleted"));
      } else {
        showSnackbar(result.error);
      }
      setDeleteId(null);
    });
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, pb: 6 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: colors.slate100 }}>
            {t("heading")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mt: 0.5 }}>
            {t("description")}
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={smallButtonStyles}
            onClick={() => setShowCreateForm(true)}
          >
            {t("addPosition")}
          </Button>
        )}
      </Box>

      {showCreateForm && (
        <Box component="form" action={createAction} sx={{ ...formStyles, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("addPosition")}
          </Typography>
          {createState?.error && (
            <Typography color="error" role="alert">
              {createState.error}
            </Typography>
          )}
          <TextField
            name="name"
            label={t("positionName")}
            size="small"
            required
            sx={textFieldStyles}
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              disabled={createPending}
              sx={{ ...smallButtonStyles, ...activeButtonStyles }}
            >
              {tc("create")}
            </Button>
            <Button sx={smallButtonStyles} onClick={() => setShowCreateForm(false)}>
              {tc("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {positions.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography sx={{ color: colors.slate400 }}>{t("noPositions")}</Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
            {t("noPositionsHint")}
          </Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: colors.slate400 }}>{t("positionName")}</TableCell>
              {canManage && <TableCell sx={{ color: colors.slate400, width: 56 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell sx={{ color: colors.slate100 }}>{pos.name}</TableCell>
                {canManage && (
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label={t("deletePosition")}
                      onClick={() => setDeleteId(pos.id)}
                      sx={{ color: colors.error }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)}>
        <DialogTitle>{t("deletePosition")}</DialogTitle>
        <DialogContent>{t("deletePositionConfirm")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{tc("cancel")}</Button>
          <Button onClick={() => deleteId && handleDelete(deleteId)} sx={{ color: colors.error }}>
            {tc("remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
