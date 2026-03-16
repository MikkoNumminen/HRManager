"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { Box, Button, Link, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

type FormState = { error: string | null };

const UpdatePositionForm: React.FC<{ personID: string; showCancel?: boolean }> = ({ personID, showCancel = true }) => {
  const [newPosition, setNewPosition] = useState("");
  const isValid = newPosition.trim().length > 0;
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updatePosition(formData);
        router.push("/managePersons");
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Change Position</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="personID" value={personID} />
      <Tooltip title="Required" placement="right" arrow>
        <TextField
          label="Enter New Position"
          name="name"
          size="small"
          value={newPosition}
          onChange={(e) => setNewPosition(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/managePersons`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!isValid || isPending} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Change
        </Button>
      </Box>
    </Box>
  );
};

export default UpdatePositionForm;
