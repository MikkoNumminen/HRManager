import { Box, Typography } from "@mui/material";

type TeamsListProps = {
  teamId: string;
  teamName: string;
  managerName: string | null;
};

export function TeamsList({ teamName, managerName }: TeamsListProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
        <Typography variant="body2"><strong>Team Name:</strong> {teamName}</Typography>
        <Typography variant="body2"><strong>Team Manager:</strong> {managerName || "No Manager Assigned"}</Typography>
      </Box>
    </Box>
  );
}
