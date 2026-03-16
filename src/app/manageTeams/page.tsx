import { Box, Typography } from "@mui/material";
import AddTeamForm from "@/components/AddTeam";
import EditableTeamsTable from "@/components/EditableTeamsTable";
import { getTeams } from "@/queries";

export default async function ManageTeamsPage() {
  const teams = await getTeams();

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage Teams
      </Typography>
      <Box mb={4}>
        <AddTeamForm />
      </Box>
      <EditableTeamsTable combinedTeams={teams} />
    </>
  );
}
