"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removeDepartment } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type FormState = { error: string | null };

const RemoveDepartmentForm: React.FC<{ departmentID: string }> = ({ departmentID }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeDepartment(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">Remove Department</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="departmentID" value={departmentID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title="Remove Department"
        message="Are you sure you want to remove this department? Teams will be unlinked but not deleted."
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

export default RemoveDepartmentForm;
