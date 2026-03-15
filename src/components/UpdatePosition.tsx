"use client";

import { smallButtonStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";

const activeButtonStyles = {
  borderColor: "rgb(74 222 128)",
  color: "rgb(74 222 128)",
  "&:hover": {
    backgroundColor: "rgb(20 83 45)",
    borderColor: "rgb(74 222 128)",
    textDecoration: "none",
  },
};

const UpdatePositionForm: React.FC<{ personID: string }> = ({ personID }) => {
  const [newPosition, setNewPosition] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("personID", personID);
      formData.set("name", newPosition);
      await updatePosition(formData);

      // After successful update, navigate to the desired route
      router.push(`/managePersons`);
    } catch (error) {
      console.error("Error updating position:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Change Position</Typography>
      <input
        type="text"
        name="name"
        placeholder="Enter New Position"
        className={inputField}
        value={newPosition}
        onChange={(e) => setNewPosition(e.target.value)}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/managePersons`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={{ ...smallButtonStyles, ...(newPosition.trim().length > 0 && activeButtonStyles) }}>
          Change
        </Button>
      </Box>
    </form>
  );
};

export default UpdatePositionForm;
