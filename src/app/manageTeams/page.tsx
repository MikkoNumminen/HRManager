import { Box, Typography } from "@mui/material";
import AddTeamForm from "@/components/AddTeam";
import EditableTeamsTable from "@/components/EditableTeamsTable";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
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
      {permissions["team:create"] && <AddTeamForm />}
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <Typography variant="h5" mb={1}>
          {t("heading")}
        </Typography>
        <EditableTeamsTable combinedTeams={teams} />
      </Box>
    </>
  );
}
