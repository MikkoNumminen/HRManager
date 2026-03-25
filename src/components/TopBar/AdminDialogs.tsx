"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { colors } from "@/muiStyles";
import { useTranslations } from "next-intl";
import ConfirmDialog from "../shared/ConfirmDialog";

interface AdminDialogsProps {
  seedDialogOpen: boolean;
  resetDialogOpen: boolean;
  onSeedClose: () => void;
  onResetClose: () => void;
  onSeed: (clearExisting: boolean) => void;
  onResetConfirm: () => void;
  formRef: React.RefObject<HTMLFormElement | null>;
  resetFormAction: () => Promise<void>;
}

export default function AdminDialogs({
  seedDialogOpen,
  resetDialogOpen,
  onSeedClose,
  onResetClose,
  onSeed,
  onResetConfirm,
  formRef,
  resetFormAction,
}: AdminDialogsProps) {
  const t = useTranslations("topBar");
  const tc = useTranslations("common");

  return (
    <>
      {/* Hidden form for resetAll server action */}
      <Box component="form" action={resetFormAction} ref={formRef} sx={{ display: "none" }} />

      <ConfirmDialog
        open={resetDialogOpen}
        title={t("resetTitle")}
        message={t("resetMessage")}
        confirmLabel={t("resetConfirm")}
        onConfirm={onResetConfirm}
        onCancel={onResetClose}
      />

      <Dialog
        open={seedDialogOpen}
        onClose={onSeedClose}
        fullWidth
        maxWidth="xs"
        aria-labelledby="seed-dialog-title"
        aria-describedby="seed-dialog-description"
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
        <DialogTitle id="seed-dialog-title" sx={{ color: colors.slate100 }}>
          {t("seedTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="seed-dialog-description" sx={{ color: colors.slate400 }}>
            {t("seedMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onSeedClose} sx={{ color: colors.slate300 }}>
            {tc("cancel")}
          </Button>
          <Button
            onClick={() => onSeed(false)}
            sx={{
              color: colors.slate100,
              "&:hover": { backgroundColor: colors.hoverOverlay },
            }}
          >
            {t("keepExisting")}
          </Button>
          <Button
            onClick={() => onSeed(true)}
            sx={{
              color: colors.error,
              "&:hover": { backgroundColor: colors.errorBg },
            }}
          >
            {t("replaceAll")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
