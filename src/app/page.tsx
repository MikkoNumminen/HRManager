/*
  TODO: Cache
  TODO: Remove team does not work with teams with manager and members  
  TODO: Adding a manager fails if the person is already a member of the team
  TODO: Add exception when creating teams or persons: Name already in use
  TODO: Removed people are not removed from team manager positions
  TODO: Make Persons to People or Member?
  TODO: Remove manager?
  TODO: Make team page selections better: 
    - Fix missclick optionality: Clicking on wrong table.., 
    - Deselect option,
    - Show only options that are available
  TODO: Tests for teams page
  TODO: Documentation for the app: usecases, uml charts?, pictures..
  TODO: Create upper panel to handle navigation and user account handling
  TODO: Tooltips/Popups UI development
  TODO: Create a list of people that are not in any team. View?
  TODO: TESTS:
        - Confirm the success of the event of removing a person:
          - Confirm that the person is no longer listed as a member of any teams after removal.
          - Confirm that the person is no longer listed as a manager of any teams after removal. 
          - Removal will work in any case
        -Tests (Jest), KEEP UPDATE!
        -E2E Testing with Playwright or Cypress?
        -Testing: https://vitest.dev/ ?
        -Accessibility Testing Example with Axe?
  TODO: Refactor: getPerson(personId)
  TODO: Validate/check: FormData ?
  TODO: Remove the rest of the Tailwind from the codebase?
  TODO: aria-labels?
  TODO: Check if this is what is wanted: ON DELETE RESTRICT ON UPDATE CASCADE
*/

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
          <Link href="/managePersons" sx={{ textDecoration: "none" }}>
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
          <Link href="/manageTeams" sx={{ textDecoration: "none" }}>
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
          <Link href="/manageDepartments" sx={{ textDecoration: "none" }}>
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
