"use client";

import { smallButtonStyles } from "@/muiStyles";
import { createTeam } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";

const AddTeamForm: React.FC = () => {
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
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={smallButtonStyles}>
          Create
        </Button>
      </Box>
    </form>
  );
};

export default AddTeamForm;
