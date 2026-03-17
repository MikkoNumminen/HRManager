import UpdateManagerForm from "@/components/UpdateManager";
import RemoveTeamForm from "@/components/RemoveTeam";
import { getPersons, getTeams } from "@/queries";
import { Box } from "@mui/material";
import AddPeopleToTeam from "@/components/AddPeopleToTeam";
import RemoveMemberFromTeam from "@/components/RemoveMemberFromTeam";
import TopBar from "@/components/TopBar";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
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
  const managerAndMemberIds = team.teamManagerId
    ? [team.teamManagerId, ...memberIds]
    : memberIds;

  return (
    <>
      <TopBar title={`Manage ${team.teamName}`} backHref="/manageTeams" />
      <Box mb={2}>
        <RemoveTeamForm teamID={teamId} />
      </Box>
      <Box mb={2}>
        <UpdateManagerForm
          teamID={teamId}
          persons={persons}
          excludeIds={team.teamManagerId ? [team.teamManagerId] : []}
        />
      </Box>
      <Box mb={2}>
        <AddPeopleToTeam
          teamID={teamId}
          persons={persons}
          excludeIds={managerAndMemberIds}
        />
      </Box>
      <Box mb={2}>
        <RemoveMemberFromTeam
          teamID={teamId}
          persons={persons}
          includeOnlyIds={memberIds}
        />
      </Box>
    </>
  );
}
