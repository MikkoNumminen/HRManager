import TopBar from "@/components/TopBar";
import OptimisticTeams from "@/components/OptimisticTeams";
import { getPagedTeams } from "@/features/teams/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManageTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
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

  const { page: pageParam = "1", q = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const { items: teams, total } = await getPagedTeams({ page, search: q });
  const t = await getTranslations("teams");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticTeams
        teams={teams}
        total={total}
        page={page}
        search={q}
        canCreate={permissions["team:create"]}
      />
    </>
  );
}
