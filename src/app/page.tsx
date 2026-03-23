import { Box, Link, Tooltip, Typography } from "@mui/material";
import PersonTable from "@/components/PersonsTable";
import TeamsTable from "@/components/TeamsTable";
import DepartmentsTable from "@/components/DepartmentsTable";
import TopBar from "@/components/TopBar";
import { boxStyles } from "@/muiStyles";
import { getPersons, getTeams, getDepartments } from "@/queries";
import { auth } from "@/auth";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function Home() {
  const session = await auth();
  const [persons, teamsData, departments] = await Promise.all([
    getPersons(),
    getTeams(),
    getDepartments(),
  ]);
  const permissions = await getUserPermissions();
  const t = await getTranslations("home");

  const canManagePersons =
    permissions["person:create"] ||
    permissions["person:delete"] ||
    permissions["person:update_position"] ||
    permissions["person:update_email"];

  const canManageTeams =
    permissions["team:create"] ||
    permissions["team:delete"] ||
    permissions["team:update_manager"] ||
    permissions["team:add_member"] ||
    permissions["team:remove_member"];

  const canManageDepartments =
    permissions["department:create"] ||
    permissions["department:delete"] ||
    permissions["department:update"] ||
    permissions["department:assign_team"];

  return (
    <>
      <TopBar title={t("title")} permissions={permissions} />
      {session ? (
        canManagePersons ? (
          <Link href="/managePersons" sx={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title={t("goToPersons")} placement="right" arrow>
              <Box component="div" sx={boxStyles} data-tutorial="persons-section">
                <Typography variant="h6" gutterBottom>
                  {t("persons")}
                </Typography>
                <PersonTable persons={persons} />
              </Box>
            </Tooltip>
          </Link>
        ) : (
          <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
            <Typography variant="h6" gutterBottom>
              Persons
            </Typography>
            <PersonTable persons={persons} />
          </Box>
        )
      ) : (
        <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
          <Typography variant="h6" gutterBottom>
            Persons
          </Typography>
          <PersonTable persons={persons} minimal />
        </Box>
      )}

      {session ? (
        canManageTeams ? (
          <Link href="/manageTeams" sx={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title={t("goToTeams")} placement="right" arrow>
              <Box component="div" sx={boxStyles} data-tutorial="teams-section">
                <Typography variant="h6" gutterBottom>
                  {t("teams")}
                </Typography>
                <TeamsTable combinedTeams={teamsData} />
              </Box>
            </Tooltip>
          </Link>
        ) : (
          <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
            <Typography variant="h6" gutterBottom>
              Teams
            </Typography>
            <TeamsTable combinedTeams={teamsData} />
          </Box>
        )
      ) : (
        <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
          <Typography variant="h6" gutterBottom>
            Teams
          </Typography>
          <TeamsTable combinedTeams={teamsData} minimal />
        </Box>
      )}

      {session ? (
        canManageDepartments ? (
          <Link href="/manageDepartments" sx={{ textDecoration: "none", color: "inherit" }}>
            <Tooltip title={t("goToDepartments")} placement="right" arrow>
              <Box component="div" sx={boxStyles} data-tutorial="departments-section">
                <Typography variant="h6" gutterBottom>
                  {t("departments")}
                </Typography>
                <DepartmentsTable departments={departments} />
              </Box>
            </Tooltip>
          </Link>
        ) : (
          <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
            <Typography variant="h6" gutterBottom>
              Departments
            </Typography>
            <DepartmentsTable departments={departments} />
          </Box>
        )
      ) : (
        <Box sx={{ ...boxStyles, "&:hover": {}, cursor: "default" }}>
          <Typography variant="h6" gutterBottom>
            Departments
          </Typography>
          <DepartmentsTable departments={departments} minimal />
        </Box>
      )}
    </>
  );
}
