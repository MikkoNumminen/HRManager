"use client";

import { smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions"; // Import the function correctly
import { collectedPageForm } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

const RemovePersonForm: React.FC<{ personID: string }> = ({ personID }) => {
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    formData.set("personID", personID);

    try {
      await removePerson(formData);
      router.push(`/managePersons`);
    } catch (error) {
      console.error("Error removing person:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Remove Person</Typography>
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
