"use client";

import { useActionState, useState } from "react";
import { Box, Button, TextField, Typography, Alert, Paper, Link as MuiLink } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { verifyTwoFactorLogin } from "@/features/twoFactor/actions";
import { colors, textFieldStyles, smallButtonStyles, activeButtonStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type FormState = { error: string | null };

export default function TwoFactorVerify() {
  const t = useTranslations("twoFactor");
  const router = useRouter();
  const { update } = useSession();
  const [useRecovery, setUseRecovery] = useState(false);

  const [state, action, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await verifyTwoFactorLogin(formData);
      if (result?.error) return { error: result.error };

      // Refresh the session so the JWT picks up the server-side verification
      // (verifyTwoFactorLogin recorded it); the flag is no longer client-supplied.
      await update();

      // Redirect to home after successful verification
      router.push("/");
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 400,
          width: "100%",
          backgroundColor: "var(--hrm-slate700)",
          border: `1px solid ${colors.slate300}`,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 48, color: colors.slate300, mb: 1 }} />
          <Typography variant="h5" sx={{ color: colors.slate100, fontWeight: 600 }}>
            {t("verifyTitle")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
            {useRecovery ? t("recoveryInstructions") : t("loginVerifyInstructions")}
          </Typography>
        </Box>

        <Box component="form" action={action}>
          {state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}
          <TextField
            name="code"
            label={useRecovery ? t("recoveryCodeLabel") : t("codeLabel")}
            placeholder={useRecovery ? "XXXX-XXXX" : "000000"}
            autoComplete="one-time-code"
            inputProps={
              useRecovery
                ? { maxLength: 9 }
                : { maxLength: 6, pattern: "[0-9]*", inputMode: "numeric" }
            }
            fullWidth
            autoFocus
            sx={{ ...textFieldStyles, mb: 2 }}
          />
          <Button
            type="submit"
            disabled={isPending}
            fullWidth
            sx={{
              ...smallButtonStyles,
              ...activeButtonStyles,
              py: 1.5,
              fontSize: "1rem",
              mb: 2,
            }}
          >
            {t("verify")}
          </Button>
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <MuiLink
            component="button"
            onClick={() => setUseRecovery(!useRecovery)}
            sx={{ color: colors.slate400, fontSize: "0.875rem", cursor: "pointer" }}
          >
            {useRecovery ? t("useAuthenticator") : t("useRecoveryCode")}
          </MuiLink>
        </Box>
      </Paper>
    </Box>
  );
}
