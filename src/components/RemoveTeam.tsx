"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/serverActions";
import { Box, Button, Link, Typography } from "@mui/material";
import { useActionState } from "react";

type FormState = { error: string | null };

const RemoveTeamForm: React.FC<{ teamID: string; showCancel?: boolean }> = ({ teamID, showCancel = true }) => {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeTeam(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Remove Team</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="teamID" value={teamID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={isPending} sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveTeamForm;
