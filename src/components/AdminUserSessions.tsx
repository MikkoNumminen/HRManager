"use client";

import { adminForceLogoutSession, adminForceLogoutAllSessions } from "@/features/sessions/actions";
import { colors, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { UserSession } from "@/schemas";

interface AdminUserSessionsProps {
  sessions: UserSession[];
  userId: string;
  userName: string | null;
}

/**
 * Parses a user agent string into a human-readable device description.
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

type FormState = { error: string | null };

export default function AdminUserSessions({ sessions, userId, userName }: AdminUserSessionsProps) {
  const t = useTranslations("sessions");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();

  const [logoutAllState, logoutAllAction, logoutAllPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await adminForceLogoutAllSessions(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("allSessionsForceLoggedOut", { name: userName ?? "User" }));
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("adminTitle")}</Typography>
        {sessions.length > 0 && (
          <form action={logoutAllAction}>
            <input type="hidden" name="userId" value={userId} />
            <Button
              type="submit"
              disabled={logoutAllPending}
              sx={{ ...smallButtonStyles, color: colors.error, borderColor: colors.error }}
            >
              {t("forceLogoutAll")}
            </Button>
          </form>
        )}
      </Box>
      {logoutAllState.error && (
        <Typography color="error" role="alert">
          {logoutAllState.error}
        </Typography>
      )}
      {sessions.length === 0 ? (
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("noActiveSessions")}
        </Typography>
      ) : (
        sessions.map((session) => <AdminSessionRow key={session.id} session={session} />)
      )}
    </Box>
  );
}

function AdminSessionRow({ session }: { session: UserSession }) {
  const t = useTranslations("sessions");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();

  const [state, action, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await adminForceLogoutSession(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("sessionForceLoggedOut"));
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.5,
        px: 1.5,
        borderBottom: `1px solid ${colors.slate600}`,
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ color: colors.slate100, fontWeight: 600 }}>
          {parseDeviceInfo(session.userAgent)}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.slate400 }}>
          {session.ipAddress ?? t("unknownIp")} &middot;{" "}
          {t("lastActive", { time: session.lastActiveAt.toLocaleString() })}
        </Typography>
        {state.error && (
          <Typography color="error" variant="caption" sx={{ display: "block" }}>
            {state.error}
          </Typography>
        )}
      </Box>
      <form action={action}>
        <input type="hidden" name="sessionId" value={session.id} />
        <Button
          type="submit"
          disabled={isPending}
          size="small"
          sx={{
            ...smallButtonStyles,
            color: colors.error,
            borderColor: colors.error,
            py: 0.5,
            px: 1.5,
            fontSize: "0.75rem",
          }}
        >
          {t("forceLogout")}
        </Button>
      </form>
    </Box>
  );
}
