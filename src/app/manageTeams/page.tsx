import TopBar from "@/components/TopBar";
import OptimisticTeams from "@/components/OptimisticTeams";
import { getTeams } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManageTeamsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManageTeams =
    permissions["team:create"] ||
    permissions["team:delete"] ||
    permissions["team:update_manager"] ||
    permissions["team:add_member"] ||
    permissions["team:remove_member"];
  if (!canManageTeams) redirect("/");

  const teams = await getTeams();
  const t = await getTranslations("teams");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticTeams teams={teams} canCreate={permissions["team:create"]} />
    </>
  );
}
