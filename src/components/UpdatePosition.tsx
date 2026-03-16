"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { Box, Button, Link, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const UpdatePositionForm: React.FC<{ personID: string; showCancel?: boolean }> = ({ personID, showCancel = true }) => {
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
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Typography variant="h5">Change Position</Typography>
      {submitError && <Typography color="error">{submitError}</Typography>}
      <TextField
        label="Enter New Position"
        name="name"
        size="small"
        required
        value={newPosition}
        onChange={(e) => setNewPosition(e.target.value)}
        sx={textFieldStyles}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/managePersons`} sx={smallButtonStyles}>Cancel</Link>}
        <Button
          type="submit"
          disabled={newPosition.trim().length === 0}
          sx={{ ...smallButtonStyles, ...(newPosition.trim().length > 0 && activeButtonStyles) }}
        >
          Change
        </Button>
      </Box>
    </Box>
  );
};

export default UpdatePositionForm;
