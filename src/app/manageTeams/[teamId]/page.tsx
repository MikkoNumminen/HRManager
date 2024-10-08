import UpdateManagerForm from "@/components/UpdateManager";
import RemoveTeamForm from "@/components/RemoveTeam";
import { getTeams } from "@/serverActions";
import { Box, Typography } from "@mui/material";
import AddPeopleToTeam from "@/components/AddPeopleToTeam";
import RemoveMemberFromTeam from "@/components/RemoveMemberFromTeam";

export default async function TeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  const teams = await getTeams();
  const team = teams.find((t) => t.teamId === params.teamId);

  if (!team) {
    return <Typography variant="h4">Team not found</Typography>;
  }

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage {team.teamName}
      </Typography>
      <Box mb={2}>
        <RemoveTeamForm teamID={params.teamId} />
      </Box>
      <Box mb={2}>
        <UpdateManagerForm teamID={params.teamId} />
      </Box>
      <Box mb={2}>
        <AddPeopleToTeam teamID={params.teamId} />
      </Box>
      <Box mb={2}>
        <RemoveMemberFromTeam teamID={params.teamId} />
      </Box>
    </>
  );
}
