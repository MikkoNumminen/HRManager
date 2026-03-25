"use client";

import { useState, useActionState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import {
  colors,
  formStyles,
  smallButtonStyles,
  activeButtonStyles,
  textFieldStyles,
  tableStyles,
} from "@/muiStyles";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";
import type { FeatureFlag } from "@/features/featureFlags/schemas";
import type { AppUser, Permissions } from "@/schemas";
import {
  createFeatureFlag,
  toggleFeatureFlag,
  deleteFeatureFlag,
} from "@/features/featureFlags/actions";

interface FeatureFlagsAdminClientProps {
  flags: FeatureFlag[];
  users: AppUser[];
  permissions: Permissions;
}

export default function FeatureFlagsAdminClient({
  flags,
  users,
  permissions,
}: FeatureFlagsAdminClientProps) {
  const t = useTranslations("featureFlags");
  const tc = useTranslations("common");
  const { showSnackbar } = useSnackbar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flagToDelete, setFlagToDelete] = useState<FeatureFlag | null>(null);

  const canManage = permissions?.["admin:manage_feature_flags"];

  const [createState, createAction, isCreatePending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      const result = await createFeatureFlag(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(t("flagCreated"));
      return undefined;
    },
    undefined,
  );

  const handleToggle = async (flag: FeatureFlag) => {
    const formData = new FormData();
    formData.append("flagId", flag.id);
    formData.append("enabled", String(!flag.enabled));
    const result = await toggleFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagUpdated"));
    }
  };

  const handleDelete = async () => {
    if (!flagToDelete) return;
    const formData = new FormData();
    formData.append("flagId", flagToDelete.id);
    const result = await deleteFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagDeleted"));
    }
    setDeleteDialogOpen(false);
    setFlagToDelete(null);
  };

  return (
    <>
      {canManage && (
        <Box component="form" action={createAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("createFlag")}
          </Typography>
          <TextField
            name="name"
            label={t("name")}
            helperText={t("flagNameHint")}
            size="small"
            required
            sx={textFieldStyles}
          />
          <TextField
            name="description"
            label={t("description")}
            size="small"
            sx={textFieldStyles}
          />
          <TextField
            name="scope"
            label={t("scope")}
            select
            defaultValue="GLOBAL"
            size="small"
            sx={{ ...textFieldStyles, minWidth: 140 }}
          >
            <MenuItem value="GLOBAL">{t("global")}</MenuItem>
            <MenuItem value="USER">{t("perUser")}</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Switch name="enabled" value="true" />}
            label={t("enabled")}
            sx={{ color: colors.slate300 }}
          />
          {createState?.error && (
            <Typography variant="caption" role="alert" sx={{ color: colors.error }}>
              {createState.error}
            </Typography>
          )}
          <Box>
            <Button
              type="submit"
              variant="outlined"
              disabled={isCreatePending}
              startIcon={<AddIcon />}
              sx={{ ...smallButtonStyles, ...activeButtonStyles }}
            >
              {t("createFlag")}
            </Button>
          </Box>
        </Box>
      )}

      {flags.length === 0 ? (
        <Typography sx={{ color: colors.slate400, py: 4, textAlign: "center" }}>
          {t("noFlags")}
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table sx={tableStyles}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("name")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("description")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("scope")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("enabled")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("userOverrides")}</TableCell>
                {canManage && <TableCell sx={{ color: colors.slate400 }}>{tc("remove")}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                  <TableCell>
                    <Typography
                      component={Link}
                      href={`/admin/feature-flags/${flag.id}`}
                      sx={{
                        color: colors.slate100,
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {flag.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: colors.slate300 }}>{flag.description || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={flag.scope === "GLOBAL" ? t("global") : t("perUser")}
                      size="small"
                      sx={{
                        backgroundColor: flag.scope === "GLOBAL" ? colors.info : colors.warning,
                        color: colors.slate100,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Switch
                        checked={flag.enabled}
                        onChange={() => handleToggle(flag)}
                        size="small"
                      />
                    ) : (
                      <Typography sx={{ color: colors.slate300 }}>
                        {flag.enabled ? t("enabled") : t("disabled")}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate300 }}>
                    {flag.userOverrideCount ?? 0}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <IconButton
                        aria-label={t("deleteFlag")}
                        onClick={() => {
                          setFlagToDelete(flag);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{ color: colors.error }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: colors.slate700,
              border: `1px solid ${colors.slate300}`,
              borderRadius: "8px",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: colors.slate100 }}>{t("deleteFlag")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: colors.slate300 }}>{t("deleteConfirm")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: colors.slate300 }}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleDelete} sx={{ color: colors.error }}>
            {t("deleteFlag")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
