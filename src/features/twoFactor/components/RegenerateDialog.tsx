"use client";

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import {
  colors,
  textFieldStyles,
  smallButtonStyles,
  activeButtonStyles,
  formButtonContainerStyles,
} from "@/muiStyles";
import { useTranslations } from "next-intl";
import RecoveryCodesList from "./RecoveryCodesList";

interface RegenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onRegenerate: (formData: FormData) => void;
  regenCodes: string[] | null;
  copied: boolean;
  onCopyRecoveryCodes: (codes: string[]) => void;
}

export default function RegenerateDialog({
  open,
  onClose,
  onRegenerate,
  regenCodes,
  copied,
  onCopyRecoveryCodes,
}: RegenerateDialogProps) {
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
      <DialogTitle sx={{ color: colors.slate100 }}>{t("regenerateTitle")}</DialogTitle>
      <DialogContent>
        {!regenCodes ? (
          <Box component="form" action={onRegenerate}>
            <Typography variant="body2" sx={{ color: colors.slate300, mb: 2 }}>
              {t("regenerateInstructions")}
            </Typography>
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
              <Button type="submit" sx={{ ...smallButtonStyles, ...activeButtonStyles }}>
                {t("regenerateCodes")}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("recoveryWarning")}
            </Alert>
            <RecoveryCodesList codes={regenCodes} onCopy={onCopyRecoveryCodes} />
            {copied && (
              <Typography variant="body2" sx={{ color: colors.green400, textAlign: "center" }}>
                {t("codesCopied")}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      {regenCodes && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ ...smallButtonStyles, ...activeButtonStyles }}>
            {t("done")}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
