"use client";

import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const UpdatePositionForm: React.FC<{ personID: string }> = ({ personID }) => {
  const [newPosition, setNewPosition] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("personID", personID);
      formData.set("name", newPosition);
      await updatePosition(formData);

      router.push(`/managePersons`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Change Position</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <input
        type="text"
        name="name"
        placeholder="Enter New Position"
        required
        className={inputField}
        value={newPosition}
        onChange={(e) => setNewPosition(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/managePersons`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" disabled={newPosition.trim().length === 0} sx={{ ...smallButtonStyles, ...(newPosition.trim().length > 0 && activeButtonStyles) }}>
          Change
        </Button>
      </Box>
    </form>
  );
};

export default UpdatePositionForm;
