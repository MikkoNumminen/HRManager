"use client";

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { colors, textFieldStyles, smallButtonStyles, formButtonContainerStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";

interface DisableDialogProps {
  open: boolean;
  onClose: () => void;
  disableAction: (payload: FormData) => void;
  disableState: { error: string | null };
  disablePending: boolean;
}

export default function DisableDialog({
  open,
  onClose,
  disableAction,
  disableState,
  disablePending,
}: DisableDialogProps) {
  const t = useTranslations("twoFactor");
  const tc = useTranslations("common");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "var(--hrm-slate700)",
          border: `1px solid ${colors.slate300}`,
        },
      }}
    >
      <DialogTitle sx={{ color: colors.slate100 }}>{t("disableTitle")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: colors.slate300, mb: 2 }}>
          {t("disableInstructions")}
        </Typography>
        <Box component="form" action={disableAction}>
          {disableState.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {disableState.error}
            </Alert>
          )}
          <TextField
            name="code"
            label={t("codeLabel")}
            placeholder="000000"
            autoComplete="one-time-code"
            inputProps={{ maxLength: 6, pattern: "[0-9]*", inputMode: "numeric" }}
            fullWidth
            sx={{ ...textFieldStyles, mb: 2 }}
          />
          <Box sx={formButtonContainerStyles}>
            <Button onClick={onClose} sx={smallButtonStyles}>
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={disablePending}
              sx={{ ...smallButtonStyles, color: colors.error, borderColor: colors.error }}
            >
              {t("disable")}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
