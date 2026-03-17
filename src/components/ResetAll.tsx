"use client";

import { resetAll } from "@/serverActions";
import { formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type FormState = { error: string | null };

export default function ResetAll() {
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState): Promise<FormState> => {
      try {
        await resetAll();
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Reset</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
          sx={{
            ...smallButtonStyles,
            borderColor: "#f87171",
            color: "#f87171",
            "&:hover": {
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              borderColor: "#f87171",
            },
          }}
        >
          Reset All Data
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title="Reset All Data"
        message="Are you sure you want to delete all persons and teams? This action cannot be undone."
        confirmLabel="Reset All"
        onConfirm={() => {
          setDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </Box>
  );
}
