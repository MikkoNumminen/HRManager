"use client";

import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
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
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Add Person</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <input
        type="text"
        name="name"
        placeholder="Enter Name"
        required
        className={inputField}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        name="email"
        placeholder="Enter Email"
        required
        className={inputField}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href=".." sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Create
        </Button>
      </Box>
    </form>
  );
};

export default AddPersonForm;
