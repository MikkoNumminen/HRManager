"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createDepartment } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";

type FormState = { error: string | null; success: boolean };

const AddDepartmentForm: React.FC = () => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const isValid = name.trim().length > 0;

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await createDepartment(formData);
        completeTutorialStep("create_department");
        return { error: null, success: true };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : tc("error"),
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
    <Box component="form" action={formAction} sx={formStyles} data-tutorial="add-department-form">
      <Typography variant="h5">{t("addDepartment")}</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <Tooltip title={tc("required")} placement="right" arrow>
        <TextField
          label={t("enterName")}
          name="name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <TextField
        label={t("descriptionOptional")}
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
          {tc("create")}
        </Button>
      </Box>
    </Box>
  );
};

export default AddDepartmentForm;
