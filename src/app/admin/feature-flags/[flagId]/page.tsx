import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import FeatureFlagDetailClient from "@/components/FeatureFlagDetailClient";
import { pageContainerStyles } from "@/muiStyles";
import { getFeatureFlagById, getUserFeatureFlags, getUsers } from "@/queries";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function FeatureFlagDetailPage({
  params,
}: {
  params: Promise<{ flagId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_feature_flags"]) redirect("/");

  const { flagId } = await params;
  const t = await getTranslations("featureFlags");

  const [flag, userFlags, users] = await Promise.all([
    getFeatureFlagById(flagId),
    getUserFeatureFlags(flagId),
    getUsers(),
  ]);

  if (!flag) notFound();

  return (
    <>
      <TopBar
        title={`${t("flagDetails")}: ${flag.name}`}
        backHref="/admin/feature-flags"
        permissions={permissions}
      />
      <Box sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("flagDetails")}
        </Typography>
        <FeatureFlagDetailClient
          flag={flag}
          userFlags={userFlags}
          users={users}
          permissions={permissions}
        />
      </Box>
    </>
  );
}
