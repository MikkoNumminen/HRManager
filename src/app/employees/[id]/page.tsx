import { getEmployeeProfile } from "@/queries";
import EmployeeProfileClient from "@/components/EmployeeProfileClient";
import TopBar from "@/components/TopBar";
import { Typography } from "@mui/material";
import { auth } from "@/auth";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("employees");

  const session = await auth();
  const permissions = session ? await getUserPermissions() : {};

  if (!UUID_REGEX.test(id)) {
    return (
      <>
        <TopBar title={t("title")} backHref="/" permissions={permissions} />
        <Typography variant="h4">{t("notFound")}</Typography>
      </>
    );
  }

  const profile = await getEmployeeProfile(id);

  if (!profile) {
    return (
      <>
        <TopBar title={t("title")} backHref="/" permissions={permissions} />
        <Typography variant="h4">{t("notFound")}</Typography>
      </>
    );
  }

  return (
    <>
      <TopBar title={profile.name} backHref="/" permissions={permissions} />
      <EmployeeProfileClient profile={profile} />
    </>
  );
}
