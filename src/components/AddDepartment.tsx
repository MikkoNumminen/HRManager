"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createDepartment } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useEffect, useState } from "react";

type FormState = { error: string | null; success: boolean };

const AddDepartmentForm: React.FC = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const isValid = name.trim().length > 0;

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await createDepartment(formData);
        return { error: null, success: true };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "An error occurred",
          success: false,
        };
      }
    },
    { error: null, success: false },
  );

  useEffect(() => {
    if (state.success) {
      setName("");
      setDescription("");
    }
  }, [state]);

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Add Department</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <Tooltip title="Required" placement="right" arrow>
        <TextField
          label="Enter Department Name"
          name="name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <TextField
        label="Description (optional)"
        name="description"
        size="small"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={textFieldStyles}
      />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          type="submit"
          disabled={!isValid || isPending}
          sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}
        >
          Create
        </Button>
      </Box>
    </Box>
  );
};

export default AddDepartmentForm;
