"use client";

import { smallButtonStyles } from "@/muiStyles";
import { updateEmail } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const UpdateEmailForm: React.FC<{ personID: string }> = ({ personID }) => {
  const [newEmail, setNewEmail] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("personID", personID);
      formData.set("name", newEmail);
      await updateEmail(formData);

      router.push(`/managePersons`);
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Change Email</Typography>
      <input
        type="text"
        name="name"
        placeholder="Enter New Email"
        className={inputField}
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/managePersons`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={smallButtonStyles}>
          Change
        </Button>
      </Box>
    </form>
  );
};

export default UpdateEmailForm;
