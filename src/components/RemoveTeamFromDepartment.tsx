"use client";

import { removeTeamFromDepartment } from "@/serverActions";
import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { CombinedTeam } from "@/schemas";

type FormState = { error: string | null };

const RemoveTeamFromDepartmentForm: React.FC<{
  currentTeams: CombinedTeam[];
}> = ({ currentTeams }) => {
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeTeamFromDepartment(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Remove Team from Department</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={selectedTeam} />

      <TextField
        select
        label="Select Team"
        size="small"
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        sx={textFieldStyles}
      >
        {currentTeams.map((t) => (
          <MenuItem key={t.teamId} value={t.teamId}>
            {t.teamName}
          </MenuItem>
        ))}
      </TextField>

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          type="submit"
          disabled={!selectedTeam || isPending}
          sx={{ ...smallButtonStyles, ...(selectedTeam && activeButtonStyles) }}
        >
          Remove
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveTeamFromDepartmentForm;
