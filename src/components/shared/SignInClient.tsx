"use client";

import { signIn } from "next-auth/react";
import { Box, Button, Divider, Typography, Paper } from "@mui/material";
import { useTranslations } from "next-intl";
import { colors } from "@/muiStyles";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface SignInClientProps {
  callbackUrl: string;
  demoEnabled: boolean;
  error?: string;
}

export default function SignInClient({ callbackUrl, demoEnabled, error }: SignInClientProps) {
  const t = useTranslations("signIn");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 400,
          width: "100%",
          border: `1px solid ${colors.slate600}`,
          borderRadius: "8px",
          backgroundColor: "transparent",
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: colors.slate100, fontWeight: 700, textAlign: "center", mb: 1 }}
        >
          HRM
        </Typography>
        <Typography variant="body2" sx={{ color: colors.slate400, textAlign: "center", mb: 3 }}>
          {t("subtitle")}
        </Typography>

        {error && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: "4px",
              backgroundColor: colors.errorBg,
              border: `1px solid ${colors.error}`,
            }}
          >
            <Typography variant="body2" sx={{ color: colors.error }}>
              {error === "OAuthAccountNotLinked" ? t("errorAccountLinked") : t("errorGeneric")}
            </Typography>
          </Box>
        )}

        {demoEnabled && (
          <>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => signIn("demo", { callbackUrl })}
              sx={{
                mb: 2,
                py: 1.5,
                backgroundColor: colors.green400,
                color: colors.slate700,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
                "&:hover": {
                  backgroundColor: colors.green400,
                  filter: "brightness(0.9)",
                },
              }}
            >
              {t("tryDemo")}
            </Button>
            <Divider sx={{ mb: 2, "&::before, &::after": { borderColor: colors.slate600 } }}>
              <Typography variant="body2" sx={{ color: colors.slate400, px: 1 }}>
                {t("or")}
              </Typography>
            </Divider>
          </>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={() => signIn("google", { callbackUrl })}
            sx={{
              py: 1.5,
              color: colors.slate100,
              borderColor: colors.slate600,
              textTransform: "none",
              fontSize: "0.95rem",
              "&:hover": {
                borderColor: colors.slate300,
                backgroundColor: colors.hoverOverlay,
              },
            }}
          >
            {t("continueGoogle")}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={() => signIn("github", { callbackUrl })}
            sx={{
              py: 1.5,
              color: colors.slate100,
              borderColor: colors.slate600,
              textTransform: "none",
              fontSize: "0.95rem",
              "&:hover": {
                borderColor: colors.slate300,
                backgroundColor: colors.hoverOverlay,
              },
            }}
          >
            {t("continueGitHub")}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
