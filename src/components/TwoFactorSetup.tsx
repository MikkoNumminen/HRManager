"use client";

import { useState, useActionState, useEffect } from "react";
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
import SecurityIcon from "@mui/icons-material/Security";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  type TwoFactorSetupResult,
} from "@/serverActions";
import {
  colors,
  formStyles,
  headerStyles,
  textFieldStyles,
  smallButtonStyles,
  activeButtonStyles,
  formButtonContainerStyles,
} from "@/muiStyles";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";

interface TwoFactorSetupProps {
  enabled: boolean;
}

type FormState = { error: string | null };

export default function TwoFactorSetup({ enabled }: TwoFactorSetupProps) {
  const t = useTranslations("twoFactor");
  const tc = useTranslations("common");
  const { showSnackbar } = useSnackbar();

  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResult | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Setup flow — step 1: generate secret
  const handleBeginSetup = async () => {
    try {
      const data = await beginTwoFactorSetup();
      setSetupData(data);
      setActiveStep(0);
      setSetupOpen(true);
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : t("setupError"), "error");
    }
  };

  // Setup flow — step 2: verify code
  const [confirmState, confirmAction, confirmPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      if (!setupData) return { error: t("setupError") };
      formData.set("secret", setupData.secret);
      formData.set("recoveryCodes", JSON.stringify(setupData.recoveryCodes));
      const result = await confirmTwoFactorSetup(formData);
      if (result?.error) return { error: result.error };
      setActiveStep(2); // Show recovery codes
      showSnackbar(t("enabled"));
      return { error: null };
    },
    { error: null },
  );

  // Disable 2FA
  const [disableState, disableAction, disablePending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await disableTwoFactor(formData);
      if (result?.error) return { error: result.error };
      setDisableOpen(false);
      showSnackbar(t("disabled"));
      return { error: null };
    },
    { error: null },
  );

  // Regenerate recovery codes
  const handleRegenerate = async (formData: FormData) => {
    const result = await regenerateRecoveryCodes(formData);
    if (result && "recoveryCodes" in result) {
      setRegenCodes(result.recoveryCodes);
      showSnackbar(t("codesRegenerated"));
    } else if (result && "error" in result && result.error) {
      showSnackbar(result.error, "error");
    }
  };

  const copyRecoveryCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [t("stepScan"), t("stepVerify"), t("stepRecovery")];

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon sx={{ color: colors.slate300 }} />
          <Typography variant="h6">{t("title")}</Typography>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: colors.slate400 }}>
        {t("description")}
      </Typography>

      {enabled ? (
        <Box sx={{ display: "flex", gap: 1, flexDirection: { xs: "column", sm: "row" } }}>
          <Button
            onClick={() => setDisableOpen(true)}
            sx={{ ...smallButtonStyles, color: colors.error, borderColor: colors.error }}
          >
            {t("disable")}
          </Button>
          <Button onClick={() => setRegenOpen(true)} sx={smallButtonStyles}>
            {t("regenerateCodes")}
          </Button>
        </Box>
      ) : (
        <Box sx={formButtonContainerStyles}>
          <Button onClick={handleBeginSetup} sx={{ ...smallButtonStyles, ...activeButtonStyles }}>
            {t("enable")}
          </Button>
        </Box>
      )}

      {/* Setup Dialog */}
      <Dialog
        open={setupOpen}
        onClose={() => activeStep < 2 && setSetupOpen(false)}
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
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(setupData.secret);
                    showSnackbar(t("secretCopied"));
                  }}
                  sx={{ color: colors.slate300 }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Button
                onClick={() => setActiveStep(1)}
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
                <Button onClick={() => setActiveStep(0)} sx={smallButtonStyles}>
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
              <RecoveryCodesList codes={setupData.recoveryCodes} onCopy={copyRecoveryCodes} />
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
            <Button
              onClick={() => {
                setSetupOpen(false);
                setSetupData(null);
                setActiveStep(0);
              }}
              sx={{ ...smallButtonStyles, ...activeButtonStyles }}
            >
              {t("done")}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Disable Dialog */}
      <Dialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
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
              <Button onClick={() => setDisableOpen(false)} sx={smallButtonStyles}>
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

      {/* Regenerate Recovery Codes Dialog */}
      <Dialog
        open={regenOpen}
        onClose={() => {
          setRegenOpen(false);
          setRegenCodes(null);
        }}
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
            <Box component="form" action={handleRegenerate}>
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
                <Button onClick={() => setRegenOpen(false)} sx={smallButtonStyles}>
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
              <RecoveryCodesList codes={regenCodes} onCopy={copyRecoveryCodes} />
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
            <Button
              onClick={() => {
                setRegenOpen(false);
                setRegenCodes(null);
              }}
              sx={{ ...smallButtonStyles, ...activeButtonStyles }}
            >
              {t("done")}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}

/** Renders recovery codes in a grid with a copy button. */
function RecoveryCodesList({
  codes,
  onCopy,
}: {
  codes: string[];
  onCopy: (codes: string[]) => void;
}) {
  const t = useTranslations("twoFactor");
  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1,
          backgroundColor: colors.slate600,
          borderRadius: 1,
          p: 2,
          mb: 2,
        }}
      >
        {codes.map((code) => (
          <Typography
            key={code}
            variant="body2"
            sx={{ fontFamily: "monospace", color: colors.slate100, letterSpacing: "0.05em" }}
          >
            {code}
          </Typography>
        ))}
      </Box>
      <Button
        onClick={() => onCopy(codes)}
        startIcon={<ContentCopyIcon />}
        sx={{ color: colors.slate300 }}
      >
        {t("copyCodes")}
      </Button>
    </Box>
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
