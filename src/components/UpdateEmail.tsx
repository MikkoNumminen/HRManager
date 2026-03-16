"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updateEmail } from "@/serverActions";
import { Box, Button, Link, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UpdateEmailForm: React.FC<{ personID: string; showCancel?: boolean }> = ({ personID, showCancel = true }) => {
  const [newEmail, setNewEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isValid = EMAIL_REGEX.test(newEmail.trim());
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("personID", personID);
      formData.set("name", newEmail);
      await updateEmail(formData);

      router.push(`/managePersons`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Typography variant="h5">Change Email</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <TextField
        label="Enter New Email"
        name="name"
        type="email"
        size="small"
        required
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        sx={textFieldStyles}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/managePersons`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!isValid} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Change
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateEmailForm;
