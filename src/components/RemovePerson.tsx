"use client";

import { smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions"; // Import the function correctly
import { collectedPageForm } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const RemovePersonForm: React.FC<{ personID: string }> = ({ personID }) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("personID", personID);

    try {
      await removePerson(formData);
      router.push(`/managePersons`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Remove Person</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/managePersons`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
    </form>
  );
};

export default RemovePersonForm;
