/*
  TODO: Add exception when creating teams or persons: Name already in use
  TODO: Removed people are not removed from team manager positions
  TODO: Create upper panel to handle navigation and user account handling
  TODO: Refactor manage[personId]: Too many accept/cancel
  TODO: Refactor manageTeams page: Make similar to managePersons
  TODO: Feature: Adding a team manager automaticly adds the new manager 
       as a memeber of the team?
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
  TODO: Give return value with zod schema?: type Team = z.infer<typeof TeamSchema> 
        Parse array for return value?: PersonSchema.array().parse
  TODO: Refactor: getPerson(personId)
  TODO: Validate/check: FormData ?
  TODO: Remove the rest of the Tailwind from the codebase?
  TODO: Make Persons to People
  TODO: Use Zod: Data integrity and type safety. KEEP UPDATE!
  TODO: aria-labels?
  TODO: Check if this is what is wanted: ON DELETE RESTRICT ON UPDATE CASCADE
*/

import { Box, Typography, Link, Tooltip } from "@mui/material";
import PersonTable from "@/components/PersonsTable";
import TeamsTable from "@/components/TeamsTable";
import { boxStyles } from "@/muiStyles";
import { getPersons, getTeams } from "@/serverActions";

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
