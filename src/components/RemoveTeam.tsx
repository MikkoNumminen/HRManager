"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type FormState = { error: string | null };

const RemoveTeamForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">Remove Team</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="teamID" value={teamID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title="Remove Team"
        message="Are you sure you want to remove this team?"
        confirmLabel="Remove"
        onConfirm={() => {
          setDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </Box>
  );
};

export default RemoveTeamForm;
