"use client";

import { kickOutUser } from "@/features/admin/actions";
import { adminResetTwoFactor } from "@/features/twoFactor/actions";
import { colors, formStyles, headerStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface DangerZoneProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  twoFactorEnabled?: boolean;
}

export default function DangerZone({
  userId,
  userName,
  userEmail,
  twoFactorEnabled,
}: DangerZoneProps) {
  const t = useTranslations("admin");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [permError, setPermError] = useState<string | null>(null);
  const [kickOutOpen, setKickOutOpen] = useState(false);
  const [kickOutPending, setKickOutPending] = useState(false);
  const [reset2FAOpen, setReset2FAOpen] = useState(false);
  const [reset2FAPending, setReset2FAPending] = useState(false);

  const displayName = userName ?? userEmail;

  const handleKickOut = async () => {
    setKickOutPending(true);
    const formData = new FormData();
    formData.set("userId", userId);
    const result = await kickOutUser(formData);
    if (result?.error) {
      setPermError(result.error);
      setKickOutPending(false);
      setKickOutOpen(false);
      return;
    }
    showSnackbar(tn("userKickedOut", { name: displayName }));
    router.push("/admin");
  };

  const handleReset2FA = async () => {
    setReset2FAPending(true);
    const formData = new FormData();
    formData.set("userId", userId);
    const result = await adminResetTwoFactor(formData);
    if (result?.error) {
      setPermError(result.error);
      setReset2FAPending(false);
      setReset2FAOpen(false);
      return;
    }
    showSnackbar(tn("twoFactorReset", { name: displayName }));
    setReset2FAOpen(false);
    setReset2FAPending(false);
  };

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6" sx={{ color: colors.error }}>
          {t("dangerZone")}
        </Typography>
      </Box>
      {permError && (
        <Typography color="error" role="alert">
          {permError}
        </Typography>
      )}
      {twoFactorEnabled && (
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1.5, sm: 2 },
            pb: 2,
            borderBottom: `1px solid ${colors.slate600}`,
          }}
        >
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("reset2FADescription")}
          </Typography>
          <Button
            onClick={() => setReset2FAOpen(true)}
            disabled={reset2FAPending}
            sx={{
              color: colors.warning,
              borderColor: colors.warning,
              "&:hover": {
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                borderColor: colors.warning,
              },
              minWidth: { xs: "auto", sm: 120 },
            }}
            variant="outlined"
          >
            {t("reset2FA")}
          </Button>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("kickOutDescription")}
        </Typography>
        <Button
          onClick={() => setKickOutOpen(true)}
          disabled={kickOutPending}
          sx={{
            color: colors.error,
            borderColor: colors.error,
            "&:hover": { backgroundColor: colors.errorBg, borderColor: colors.error },
            minWidth: { xs: "auto", sm: 120 },
          }}
          variant="outlined"
        >
          {t("kickOut")}
        </Button>
      </Box>
      <ConfirmDialog
        open={reset2FAOpen}
        title={t("reset2FATitle")}
        message={t("reset2FAConfirm", { name: displayName })}
        confirmLabel={t("reset2FA")}
        onConfirm={handleReset2FA}
        onCancel={() => setReset2FAOpen(false)}
      />
      <ConfirmDialog
        open={kickOutOpen}
        title={t("kickOutTitle")}
        message={t("kickOutConfirm", { name: displayName })}
        confirmLabel={t("kickOut")}
        onConfirm={handleKickOut}
        onCancel={() => setKickOutOpen(false)}
      />
    </Box>
  );
}
