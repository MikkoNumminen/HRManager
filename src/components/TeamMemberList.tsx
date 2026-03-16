import { Box, Typography } from "@mui/material";

type TeamMemberListProps = {
  teamName: string;
  members: {
    name: string;
    email: string;
  }[];
};

export function TeamMemberList({ teamName, members }: TeamMemberListProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
        <Typography variant="body2"><strong>Team Name:</strong> {teamName}</Typography>
        <Typography variant="body2"><strong>Team Members:</strong> {members.map((m) => m.name + ", ")}</Typography>
      </Box>
    </Box>
  );
}
