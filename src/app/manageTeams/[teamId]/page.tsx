import UpdateManagerForm from "@/features/persons/components/UpdateManagerForm";
import UpdateTeamNameForm from "@/features/teams/components/UpdateTeamNameForm";
import RemoveTeamForm from "@/features/teams/components/RemoveTeamForm";
import { getPersons } from "@/features/persons/queries";
import { getTeams, getTeamDeleteImpact } from "@/features/teams/queries";
import { Typography } from "@mui/material";
import AddMemberForm from "@/features/teams/components/AddMemberForm";
import RemoveMemberForm from "@/features/teams/components/RemoveMemberForm";
import TopBar from "@/components/TopBar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const t = await getTranslations("teams");
  const { teamId } = await params;

  if (!UUID_REGEX.test(teamId)) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const [teams, persons] = await Promise.all([getTeams(), getPersons()]);
  const team = teams.find((tm) => tm.teamId === teamId);

  if (!team) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const teamImpact = permissions["team:delete"] ? await getTeamDeleteImpact(teamId) : undefined;
  const memberIds = team.members.map((m) => m.personId);
  const managerAndMemberIds = team.teamManagerId ? [team.teamManagerId, ...memberIds] : memberIds;

  return (
    <>
      <TopBar
        title={t("manageHeading", { name: team.teamName })}
        backHref="/manageTeams"
        permissions={permissions}
      />
      {permissions["team:delete"] && <RemoveTeamForm teamID={teamId} impact={teamImpact} />}
      {permissions["team:update_name"] && (
        <UpdateTeamNameForm teamID={teamId} currentName={team.teamName} />
      )}
      {permissions["team:update_manager"] && (
        <UpdateManagerForm
          teamID={teamId}
          persons={persons}
          excludeIds={team.teamManagerId ? [team.teamManagerId] : []}
        />
      )}
      {permissions["team:add_member"] && (
        <AddMemberForm teamID={teamId} persons={persons} excludeIds={managerAndMemberIds} />
      )}
      {permissions["team:remove_member"] && (
        <RemoveMemberForm teamID={teamId} persons={persons} includeOnlyIds={memberIds} />
      )}
    </>
  );
}
