import { Box, Typography } from "@mui/material";
import AddTeamForm from "@/components/AddTeam";
import EditableTeamsTable from "@/components/EditableTeamsTable";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getTeams } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ManageTeamsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const teams = await getTeams();

  return (
    <>
      <TopBar title="Manage Teams" backHref="/" />
      <AddTeamForm />
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <Typography variant="h5" mb={1}>Teams</Typography>
        <EditableTeamsTable combinedTeams={teams} />
      </Box>
    </>
  );
}
