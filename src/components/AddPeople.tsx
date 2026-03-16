"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import { Box, Button, Link, TextField, Typography } from "@mui/material";
import { useState } from "react";

const AddPersonForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      await createPerson(new FormData(event.currentTarget));
      setName("");
      setEmail("");
      onSuccess?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Typography variant="h5">Add Person</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <TextField
        label="Enter Name"
        name="name"
        size="small"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={textFieldStyles}
      />
      <TextField
        label="Enter Email"
        name="email"
        type="email"
        size="small"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={textFieldStyles}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" disabled={!isValid} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Create
        </Button>
      </Box>
    </Box>
  );
};

export default AddPersonForm;
