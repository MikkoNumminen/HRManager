import TopBar from "@/components/TopBar";
import OrgChartClient from "@/components/OrgChartClient";
import { getOrgChartData } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function OrgChartPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["person:read"]) redirect("/");

  const t = await getTranslations("orgChart");
  const data = await getOrgChartData();

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <OrgChartClient data={data} />
    </>
  );
}
