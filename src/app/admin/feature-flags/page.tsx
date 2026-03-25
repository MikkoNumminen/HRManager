import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import FeatureFlagsAdminClient from "@/components/FeatureFlagsAdminClient";
import { pageContainerStyles } from "@/muiStyles";
import { getFeatureFlags } from "@/queries";
import { getUsers } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function FeatureFlagsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_feature_flags"]) redirect("/");

  const t = await getTranslations("featureFlags");
  const [flags, users] = await Promise.all([getFeatureFlags(), getUsers()]);

  return (
    <>
      <TopBar title={t("title")} backHref="/admin" permissions={permissions} />
      <Box sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <FeatureFlagsAdminClient flags={flags} users={users} permissions={permissions} />
      </Box>
    </>
  );
}
