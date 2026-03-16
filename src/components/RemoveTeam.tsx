"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/serverActions";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RemoveTeamForm: React.FC<{ teamID: string; showCancel?: boolean }> = ({ teamID, showCancel = true }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("teamID", teamID);

    try {
      await removeTeam(formData);
      router.push(`/manageTeams`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Typography variant="h5">Remove Team</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveTeamForm;
