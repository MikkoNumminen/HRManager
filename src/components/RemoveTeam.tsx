"use client";

import { smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/serverActions";
import { collectedPageForm } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

const RemoveTeamForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("teamID", teamID);

    try {
      await removeTeam(formData);
      router.push(`/manageTeams`);
    } catch (error) {
      console.error("Error removing team:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Remove Team</Typography>
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/manageTeams`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
    </form>
  );
};

export default RemoveTeamForm;
