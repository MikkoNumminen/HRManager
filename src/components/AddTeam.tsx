"use client";

import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";
import { createTeam } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
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
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Add Team</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <input
        type="text"
        name="name"
        placeholder="Enter Team Name"
        required
        className={inputField}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Create
        </Button>
      </Box>
    </form>
  );
};

export default AddTeamForm;
