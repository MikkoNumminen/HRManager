"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type FormState = { error: string | null };

const RemovePersonForm: React.FC<{ personID: string }> = ({ personID }) => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removePerson(formData);
        router.push("/managePersons");
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">Remove Person</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="personID" value={personID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title="Remove Person"
        message="Are you sure you want to remove this person? This will also remove them from all teams."
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

export default RemovePersonForm;
