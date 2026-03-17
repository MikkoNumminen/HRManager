import { FormControlLabel, Radio, Typography } from "@mui/material";
import { colors, radioStyles } from "@/muiStyles";
import { Person } from "@/schemas";

type PersonListProps = Pick<Person, "id" | "name" | "position" | "email">;

export function RemovePersonCheckBoxList({ id, name, position, email }: PersonListProps) {
  return (
    <FormControlLabel
      value={id}
      control={<Radio name="personID" value={id} sx={radioStyles} size="small" />}
      label={
        <Typography sx={{ color: colors.slate100, fontSize: "0.875rem" }}>
          <strong>Name:</strong> {name} <strong>Position:</strong> {position ?? ""}{" "}
          <strong>Email:</strong> {email ?? ""}
        </Typography>
      }
      sx={{ display: "flex", alignItems: "center", mx: 0, mb: 0.5 }}
    />
  );
}
