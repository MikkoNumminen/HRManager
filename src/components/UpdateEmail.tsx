"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updateEmail } from "@/serverActions";
import { Box, Button, Link, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = { error: string | null };

const UpdateEmailForm: React.FC<{ personID: string; showCancel?: boolean }> = ({ personID, showCancel = true }) => {
  const [newEmail, setNewEmail] = useState("");
  const isValid = EMAIL_REGEX.test(newEmail.trim());
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updateEmail(formData);
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
      <Typography variant="h5">Change Email</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="personID" value={personID} />
      <Tooltip title="Required — must be a valid email address" placement="right" arrow>
        <TextField
          label="Enter New Email"
          name="name"
          type="email"
          size="small"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
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

export default UpdateEmailForm;
