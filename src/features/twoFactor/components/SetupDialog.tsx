"use client";

import { useEffect } from "react";
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
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { type TwoFactorSetupResult } from "@/features/twoFactor/actions";
import {
  colors,
  textFieldStyles,
  smallButtonStyles,
  activeButtonStyles,
  formButtonContainerStyles,
} from "@/muiStyles";
import { useTranslations } from "next-intl";
import RecoveryCodesList from "./RecoveryCodesList";

interface SetupDialogProps {
  open: boolean;
  onClose: () => void;
  setupData: TwoFactorSetupResult | null;
  activeStep: number;
  onStepChange: (step: number) => void;
  confirmAction: (payload: FormData) => void;
  confirmState: { error: string | null };
  confirmPending: boolean;
  onDone: () => void;
  copied: boolean;
  onCopyRecoveryCodes: (codes: string[]) => void;
  onCopySecret: () => void;
}

export default function SetupDialog({
  open,
  onClose,
  setupData,
  activeStep,
  onStepChange,
  confirmAction,
  confirmState,
  confirmPending,
  onDone,
  copied,
  onCopyRecoveryCodes,
  onCopySecret,
}: SetupDialogProps) {
  const t = useTranslations("twoFactor");

  const steps = [t("stepScan"), t("stepVerify"), t("stepRecovery")];

  return (
    <Dialog
      open={open}
      onClose={() => activeStep < 2 && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "var(--hrm-slate700)",
          border: `1px solid ${colors.slate300}`,
        },
      }}
    >
      <DialogTitle sx={{ color: colors.slate100 }}>{t("setupTitle")}</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3, mt: 1 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  "& .MuiStepLabel-label": { color: colors.slate300 },
                  "& .MuiStepLabel-label.Mui-active": { color: colors.slate100 },
                  "& .MuiStepLabel-label.Mui-completed": { color: colors.green400 },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: QR Code + secret */}
        {activeStep === 0 && setupData && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: colors.slate300, mb: 2 }}>
              {t("scanInstructions")}
            </Typography>
            {/* QR code rendered as a data URI via the otpauth URI */}
            <Box
              sx={{
                backgroundColor: "#fff",
                borderRadius: 2,
                p: 2,
                display: "inline-block",
                mb: 2,
              }}
            >
              <img id="totp-qr-code" alt={t("qrCodeAlt")} style={{ width: 200, height: 200 }} />
            </Box>
            <QrCodeRenderer uri={setupData.uri} />
            <Typography variant="body2" sx={{ color: colors.slate400, mb: 1 }}>
              {t("manualEntry")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                backgroundColor: colors.slate600,
                borderRadius: 1,
                p: 1,
                mb: 2,
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: colors.slate100,
                  fontFamily: "monospace",
                  letterSpacing: "0.1em",
                  wordBreak: "break-all",
                }}
              >
                {setupData.secret}
              </Typography>
              <IconButton size="small" onClick={onCopySecret} sx={{ color: colors.slate300 }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Button
              onClick={() => onStepChange(1)}
              sx={{ ...smallButtonStyles, ...activeButtonStyles }}
            >
              {t("next")}
            </Button>
          </Box>
        )}

        {/* Step 1: Verify code */}
        {activeStep === 1 && (
          <Box component="form" action={confirmAction}>
            <Typography variant="body2" sx={{ color: colors.slate300, mb: 2 }}>
              {t("verifyInstructions")}
            </Typography>
            {confirmState.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {confirmState.error}
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
              <Button onClick={() => onStepChange(0)} sx={smallButtonStyles}>
                {t("back")}
              </Button>
              <Button
                type="submit"
                disabled={confirmPending}
                sx={{ ...smallButtonStyles, ...activeButtonStyles }}
              >
                {t("verifyAndEnable")}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 2: Recovery codes */}
        {activeStep === 2 && setupData && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("recoveryWarning")}
            </Alert>
            <RecoveryCodesList codes={setupData.recoveryCodes} onCopy={onCopyRecoveryCodes} />
            {copied && (
              <Typography variant="body2" sx={{ color: colors.green400, textAlign: "center" }}>
                {t("codesCopied")}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      {activeStep === 2 && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onDone} sx={{ ...smallButtonStyles, ...activeButtonStyles }}>
            {t("done")}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

/**
 * Client-side QR code renderer.
 * Uses the qrcode library to render the otpauth URI into the img element.
 */
function QrCodeRenderer({ uri }: { uri: string }) {
  useEffect(() => {
    let cancelled = false;
    // Dynamic import of qrcode to avoid SSR issues
    import("qrcode").then((QRCode) => {
      if (cancelled) return;
      const img = document.getElementById("totp-qr-code") as HTMLImageElement | null;
      if (img) {
        QRCode.toDataURL(uri, { width: 200, margin: 1 }).then((dataUrl: string) => {
          if (!cancelled && img) {
            img.src = dataUrl;
          }
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return null;
}
