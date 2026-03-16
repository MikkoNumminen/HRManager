import { FormControlLabel, Radio, Typography } from "@mui/material";
import { colors, radioStyles } from "@/muiStyles";

type TeamsCheckBoxListProps = {
  teamId: string;
  teamName: string;
  managerName: string | null;
};

export function ManageTeamsCheckBoxList({
  teamId,
  teamName,
  managerName,
}: TeamsCheckBoxListProps) {
  return (
    <FormControlLabel
      value={teamId}
      control={<Radio name="teamID" value={teamId} sx={radioStyles} size="small" />}
      label={
        <Typography sx={{ color: colors.slate100, fontSize: "0.875rem" }}>
          <strong>Team Name:</strong> {teamName}{" "}
          <strong>Team Manager:</strong>{" "}
          {managerName || "No Manager Assigned"}
        </Typography>
      }
      sx={{ display: "flex", alignItems: "center", mx: 0, mb: 0.5 }}
    />
  );
}
