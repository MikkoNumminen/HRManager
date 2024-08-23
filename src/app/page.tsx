/*
 TODO: Refactor manage[personId]: Too many accept/cancel
 TODO: Refactor manageTeams page: Make similar to managePersons 
 TODO: Use Zod: Data integrity and type safety. KEEP UPDATE!
 TODO: Tests (Jest), KEEP UPDATE!
       E2E Testing Example with Cypress?
       Accessibility Testing Example with Axe? 
 TODO: Feature: Adding a team manager automaticly adds the new manager 
       as a memeber of the team?
 TODO: - Confirm the success of the event of removing a person:
       - Ensure that the person is no longer listed as a member of any teams.
       - Ensure that the person is no longer listed as a manager of any teams. 
       - Pupup/View for exceptions?
       - Removal will work in any case
 TODO: Create a list of people that are not in any team. View?
 TODO: Create upper panel to handle navigation and user account handling
 TODO: Remove the rest of the Tailwind from the codebase?
 TODO: Make Persons to People
 TODO: aria-labels?
 TODO: Check if this is what is wanted: ON DELETE RESTRICT ON UPDATE CASCADE
*/

import { Box, Typography, Link, Tooltip } from "@mui/material";
import PersonTable from "@/components/PersonsTable";
import TeamsTable from "@/components/TeamsTable";
import { boxStyles } from "@/muiStyles";
import { getPersons, getTeams } from "@/utilities";

export default async function Home() {
  const persons = await getPersons();
  const teamsData = await getTeams();

  return (
    <Box sx={{ display: "flex" }}>
      <Box sx={{ flex: "1", padding: "20px" }}>
        <Typography variant="h4" gutterBottom sx={{ marginBottom: "20px" }}>
          Human Resources Management System
        </Typography>
        <Typography variant="h6" gutterBottom>
          Persons
        </Typography>
        <Link href="/managePersons" sx={{ textDecoration: "none" }}>
          <Tooltip title="Go to Persons Manager" arrow>
            <Box component="div" sx={boxStyles}>
              <PersonTable persons={persons} />
            </Box>
          </Tooltip>
        </Link>

        <Typography variant="h6" gutterBottom>
          Teams
        </Typography>
        <Link href="/manageTeams" sx={{ textDecoration: "none" }}>
          <Tooltip title="Go to Teams Manager" arrow>
            <Box component="div" sx={boxStyles}>
              <TeamsTable combinedTeams={teamsData} />
            </Box>
          </Tooltip>
        </Link>
      </Box>
    </Box>
  );
}
