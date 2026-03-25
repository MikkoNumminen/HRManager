import { Box } from "@mui/material";
import TopBar from "@/components/TopBar";
import ProfileEditor from "@/components/ProfileEditor";
import ActiveSessions from "@/components/ActiveSessions";
import { pageContainerStyles } from "@/muiStyles";
import { getProfile } from "@/features/profile/queries";
import { getMyActiveSessions } from "@/features/sessions/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/");

  const [profile, permissions, t, activeSessions] = await Promise.all([
    getProfile(),
    getUserPermissions(),
    getTranslations("profile"),
    getMyActiveSessions(),
  ]);

  if (!profile) redirect("/");

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <Box sx={pageContainerStyles}>
        <ProfileEditor profile={profile} />
        <ActiveSessions sessions={activeSessions} currentSessionId={session.user.sessionId} />
      </Box>
    </>
  );
}
