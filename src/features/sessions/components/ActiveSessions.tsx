"use client";

import { signOutOtherSessions } from "@/features/sessions/actions";
import { colors, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { formatDate } from "@/utils/formatDate";
import { Box, Button, Chip, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";
import { UserSession } from "@/schemas";

interface ActiveSessionsProps {
  sessions: UserSession[];
  currentSessionId?: string;
}

/**
 * Parses a user agent string into a human-readable device description.
 * Extracts browser name and OS platform.
 */
function parseDeviceInfo(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  let browser = "Unknown browser";
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";

  let os = "Unknown OS";
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

  return `${browser} on ${os}`;
}

export default function ActiveSessions({ sessions, currentSessionId }: ActiveSessionsProps) {
  const t = useTranslations("sessions");
  const tn = useTranslations("notifications");

  const [state, action, isPending] = useFormAction(async () => signOutOtherSessions(), {
    successMessage: tn("otherSessionsSignedOut"),
  });

  const otherSessionCount = sessions.filter((s) => s.id !== currentSessionId).length;

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("title")}</Typography>
        {otherSessionCount > 0 && (
          <form action={action}>
            <Button
              type="submit"
              disabled={isPending}
              sx={{ ...smallButtonStyles, color: colors.error, borderColor: colors.error }}
            >
              {t("signOutOthers")}
            </Button>
          </form>
        )}
      </Box>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <Typography variant="body2" sx={{ color: colors.slate400 }}>
        {t("description")}
      </Typography>
      {sessions.length === 0 ? (
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("noSessions")}
        </Typography>
      ) : (
        sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          return (
            <Box
              key={session.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1.5,
                px: 1.5,
                borderBottom: `1px solid ${colors.slate600}`,
                borderRadius: "4px",
                ...(isCurrent && {
                  border: `1px solid ${colors.green400}`,
                  backgroundColor: "rgba(74, 222, 128, 0.05)",
                }),
              }}
            >
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ color: colors.slate100, fontWeight: 600 }}>
                    {parseDeviceInfo(session.userAgent)}
                  </Typography>
                  {isCurrent && (
                    <Chip
                      label={t("currentSession")}
                      size="small"
                      sx={{
                        backgroundColor: "rgba(74, 222, 128, 0.15)",
                        color: colors.green400,
                        fontWeight: 600,
                        height: 20,
                        fontSize: "0.65rem",
                      }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: colors.slate400 }}>
                  {session.ipAddress ?? t("unknownIp")} &middot;{" "}
                  {t("lastActive", { time: formatDate(session.lastActiveAt) })}
                </Typography>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
