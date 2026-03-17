import { Box, Typography } from "@mui/material";
import AddTeamForm from "@/components/AddTeam";
import EditableTeamsTable from "@/components/EditableTeamsTable";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getTeams } from "@/queries";

export default async function ManageTeamsPage() {
  const teams = await getTeams();

  return (
    <>
      <TopBar title="Manage Teams" backHref="/" />
      <Box mb={4}>
        <AddTeamForm />
      </Box>
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <Typography variant="h5" mb={2}>Teams</Typography>
        <EditableTeamsTable combinedTeams={teams} />
      </Box>
    </>
  );
}
