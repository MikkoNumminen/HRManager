import UpdateManagerForm from "@/components/UpdateManager";
import RemoveTeamForm from "@/components/RemoveTeam";
import { getPersons, getTeams } from "@/queries";
import { Typography } from "@mui/material";
import AddPeopleToTeam from "@/components/AddPeopleToTeam";
import RemoveMemberFromTeam from "@/components/RemoveMemberFromTeam";
import TopBar from "@/components/TopBar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const { teamId } = await params;

  if (!UUID_REGEX.test(teamId)) {
    return <Typography variant="h4">Team not found</Typography>;
  }

  const [teams, persons] = await Promise.all([getTeams(), getPersons()]);
  const team = teams.find((t) => t.teamId === teamId);

  if (!team) {
    return <Typography variant="h4">Team not found</Typography>;
  }

  const memberIds = team.members.map((m) => m.personId);
  const managerAndMemberIds = team.teamManagerId ? [team.teamManagerId, ...memberIds] : memberIds;

  return (
    <>
      <TopBar title={`Manage ${team.teamName}`} backHref="/manageTeams" />
      {permissions["team:delete"] && <RemoveTeamForm teamID={teamId} />}
      {permissions["team:update_manager"] && (
        <UpdateManagerForm
          teamID={teamId}
          persons={persons}
          excludeIds={team.teamManagerId ? [team.teamManagerId] : []}
        />
      )}
      {permissions["team:add_member"] && (
        <AddPeopleToTeam teamID={teamId} persons={persons} excludeIds={managerAndMemberIds} />
      )}
      {permissions["team:remove_member"] && (
        <RemoveMemberFromTeam teamID={teamId} persons={persons} includeOnlyIds={memberIds} />
      )}
    </>
  );
}
