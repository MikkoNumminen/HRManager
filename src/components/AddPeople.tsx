"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import { Box, Button, Link, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useEffect, useState } from "react";

type FormState = { error: string | null; success: boolean };

const AddPersonForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await createPerson(formData);
        return { error: null, success: true };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred", success: false };
      }
    },
    { error: null, success: false },
  );

  useEffect(() => {
    if (state.success) {
      setName("");
      setEmail("");
    }
  }, [state]);

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Add Person</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <Tooltip title="Required" placement="right" arrow>
        <TextField
          label="Enter Name"
          name="name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Tooltip title="Required — must be a valid email address" placement="right" arrow>
        <TextField
          label="Enter Email"
          name="email"
          type="email"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>Cancel</Link>
        <Button type="submit" disabled={!isValid || isPending} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Create
        </Button>
      </Box>
    </Box>
  );
};

export default AddPersonForm;
