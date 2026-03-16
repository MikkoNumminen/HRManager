import UpdateManagerForm from "@/components/UpdateManager";
import RemoveTeamForm from "@/components/RemoveTeam";
import { getTeams } from "@/serverActions";
import { Box, Typography } from "@mui/material";
import AddPeopleToTeam from "@/components/AddPeopleToTeam";
import RemoveMemberFromTeam from "@/components/RemoveMemberFromTeam";

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

  const teams = await getTeams();
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
      <Typography variant="h4" mb={2}>Manage {team.teamName}</Typography>
      <Box mb={2}>
        <RemoveTeamForm teamID={teamId} />
      </Box>
      <Box mb={2}>
        <UpdateManagerForm
          teamID={teamId}
          showCancel={false}
          excludeIds={team.teamManagerId ? [team.teamManagerId] : []}
        />
      </Box>
      <Box mb={2}>
        <AddPeopleToTeam
          teamID={teamId}
          showCancel={false}
          excludeIds={managerAndMemberIds}
        />
      </Box>
      <Box mb={2}>
        <RemoveMemberFromTeam
          teamID={teamId}
          showCancel={false}
          includeOnlyIds={memberIds}
        />
      </Box>
    </>
  );
}
