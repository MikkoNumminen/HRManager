import { Box, Typography } from "@mui/material";

type PersonListProps = {
  id: string;
  name: string;
  position: string;
  email: string;
};

export function PersonList({ name, position, email }: PersonListProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5 }}>
      <Box sx={{ display: "flex", flexDirection: "column", borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
        <Typography variant="body2"><strong>Name:</strong> {name}</Typography>
        <Typography variant="body2"><strong>Position:</strong> {position}</Typography>
        <Typography variant="body2"><strong>Email:</strong> {email}</Typography>
      </Box>
    </Box>
  );
}
