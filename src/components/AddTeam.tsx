"use client";

import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";
import { createTeam } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useState } from "react";

const AddTeamForm: React.FC = () => {
  const [name, setName] = useState("");
  const isValid = name.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createTeam(new FormData(event.currentTarget));
      window.location.reload();
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Add Team</Typography>
      <input
        type="text"
        name="name"
        placeholder="Enter Team Name"
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
