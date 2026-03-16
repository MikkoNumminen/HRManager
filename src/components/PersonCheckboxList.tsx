import { PersonSchema } from "@/schemas";
import { colors, radioStyles } from "@/muiStyles";
import { z } from "zod";
import { FormControlLabel, Radio, Typography } from "@mui/material";

type PersonListProps = z.infer<typeof PersonSchema> & {
  onSelect: (personID: string) => void;
  groupName: string;
  selectedId: string;
};

export function PersonCheckBoxList({
  id,
  name,
  position,
  email,
  onSelect,
  groupName,
  selectedId,
}: PersonListProps) {
  const isSelected = selectedId === id;
  const inputId = `${groupName}-${id}`;

  return (
    <FormControlLabel
      value={id}
      control={
        <Radio
          id={inputId}
          name={groupName}
          value={id}
          checked={isSelected}
          onChange={() => onSelect(id)}
          onClick={() => { if (isSelected) onSelect(""); }}
          sx={radioStyles}
          size="small"
        />
      }
      label={
        <Typography
          sx={{
            textDecoration: isSelected ? "line-through" : "none",
            color: isSelected ? colors.slate400 : colors.slate100,
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          <strong>Name:</strong> {name} <strong>Position:</strong>{" "}
          {position ?? "N/A"} <strong>Email:</strong>{" "}
          {email || "No email provided"}
        </Typography>
      }
      sx={{ display: "flex", alignItems: "center", mx: 0, mb: 0.5 }}
    />
  );
}
