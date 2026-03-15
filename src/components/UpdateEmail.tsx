"use client";

import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";
import { updateEmail } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UpdateEmailForm: React.FC<{ personID: string }> = ({ personID }) => {
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
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Change Email</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <input
        type="email"
        name="name"
        placeholder="Enter New Email"
        required
        className={inputField}
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/managePersons`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" disabled={!isValid} sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}>
          Change
        </Button>
      </Box>
    </form>
  );
};

export default UpdateEmailForm;
