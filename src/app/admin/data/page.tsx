import { Box } from "@mui/material";
import TopBar from "@/components/TopBar";
import DataImportExport from "@/components/DataImportExport";
import { pageContainerStyles } from "@/muiStyles";
import { getDataExportCounts } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function DataPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["data:import"] && !permissions["data:export"]) redirect("/");

  const [counts, t] = await Promise.all([getDataExportCounts(), getTranslations("dataIO")]);

  return (
    <>
      <TopBar title={t("title")} backHref="/admin" permissions={permissions} />
      <Box sx={pageContainerStyles}>
        <DataImportExport counts={counts} permissions={permissions} />
      </Box>
    </>
  );
}
