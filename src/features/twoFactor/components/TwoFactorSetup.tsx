"use client";

import { useState, useActionState } from "react";
import { Box, Button, Typography } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  type TwoFactorSetupResult,
} from "@/features/twoFactor/actions";
import {
  colors,
  formStyles,
  headerStyles,
  smallButtonStyles,
  activeButtonStyles,
  formButtonContainerStyles,
} from "@/muiStyles";
import { useTranslations } from "next-intl";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import SetupDialog from "./SetupDialog";
import DisableDialog from "./DisableDialog";
import RegenerateDialog from "./RegenerateDialog";

interface TwoFactorSetupProps {
  enabled: boolean;
}

type FormState = { error: string | null };

export default function TwoFactorSetup({ enabled }: TwoFactorSetupProps) {
  const t = useTranslations("twoFactor");
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

  const handleCopySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      showSnackbar(t("secretCopied"));
    }
  };

  const handleSetupDone = () => {
    setSetupOpen(false);
    setSetupData(null);
    setActiveStep(0);
  };

  const handleRegenClose = () => {
    setRegenOpen(false);
    setRegenCodes(null);
  };

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

      <SetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        setupData={setupData}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        confirmAction={confirmAction}
        confirmState={confirmState}
        confirmPending={confirmPending}
        onDone={handleSetupDone}
        copied={copied}
        onCopyRecoveryCodes={copyRecoveryCodes}
        onCopySecret={handleCopySecret}
      />

      <DisableDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        disableAction={disableAction}
        disableState={disableState}
        disablePending={disablePending}
      />

      <RegenerateDialog
        open={regenOpen}
        onClose={handleRegenClose}
        onRegenerate={handleRegenerate}
        regenCodes={regenCodes}
        copied={copied}
        onCopyRecoveryCodes={copyRecoveryCodes}
      />
    </Box>
  );
}
