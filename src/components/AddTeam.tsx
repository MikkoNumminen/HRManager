"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createTeam } from "@/serverActions";
import { Box, Button, Link, TextField, Tooltip, Typography } from "@mui/material";
import { useState } from "react";

const AddTeamForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isValid = name.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      await createTeam(new FormData(event.currentTarget));
      setName("");
      onSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Typography variant="h5">Add Team</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <Tooltip title="Required" placement="right" arrow>
        <TextField
          label="Enter Team Name"
          name="name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>Cancel</Link>
        <Button type="submit" disabled={!isValid} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Create
        </Button>
      </Box>
    </Box>
  );
};

export default AddTeamForm;
