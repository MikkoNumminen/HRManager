import TopBar from "@/components/TopBar";
import EmployeeSelfProfileClient from "@/features/employee/components/EmployeeSelfProfileClient";
import { getSelfProfile } from "@/features/employee/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { Alert, Box } from "@mui/material";

export default async function EmployeeProfilePage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const permissions = await getUserPermissions();
  const t = await getTranslations("employee");

  const profile = await getSelfProfile();

  if (!profile) {
    return (
      <>
        <TopBar title={t("profile")} backHref="/employee" permissions={permissions} />
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">{t("noProfile")}</Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("profile")} backHref="/employee" permissions={permissions} />
      <EmployeeSelfProfileClient profile={profile} />
    </>
  );
}
