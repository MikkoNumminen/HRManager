"use client";

import { smallButtonStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import { collectedPageForm, inputField } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
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

const AddPersonForm: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const isValid = name.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await createPerson(new FormData(event.currentTarget));
      window.location.reload();
    } catch (error) {
      console.error("Error creating person:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <Typography variant="h5">Add Person</Typography>
      <input
        type="text"
        name="name"
        placeholder="Enter Name"
        className={inputField}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        name="email"
        placeholder="Enter Email"
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
