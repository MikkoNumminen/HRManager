import { Box } from "@mui/material";
import TopBar from "@/components/TopBar";
import ProfileEditor from "@/components/ProfileEditor";
import { pageContainerStyles } from "@/muiStyles";
import { getProfile } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/");

  const [profile, permissions, t] = await Promise.all([
    getProfile(),
    getUserPermissions(),
    getTranslations("profile"),
  ]);

  if (!profile) redirect("/");

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <Box sx={pageContainerStyles}>
        <ProfileEditor profile={profile} />
      </Box>
    </>
  );
}
