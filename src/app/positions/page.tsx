import TopBar from "@/components/TopBar";
import PositionCatalogClient from "@/components/PositionCatalogClient";
import { getPositions } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function PositionsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["position:manage"]) redirect("/");

  const t = await getTranslations("positions");
  const positions = await getPositions();

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <PositionCatalogClient positions={positions} permissions={permissions} />
    </>
  );
}
