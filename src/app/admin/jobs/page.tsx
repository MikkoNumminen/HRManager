import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import AdminJobsClient from "@/components/AdminJobsClient";
import { pageContainerStyles } from "@/muiStyles";
import { getJobQueueStatuses } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function AdminJobsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_jobs"]) redirect("/");

  const statuses = await getJobQueueStatuses();
  const t = await getTranslations("jobs");

  return (
    <>
      <TopBar title={t("title")} backHref="/admin" permissions={permissions} />
      <Box sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <AdminJobsClient statuses={statuses} />
      </Box>
    </>
  );
}
