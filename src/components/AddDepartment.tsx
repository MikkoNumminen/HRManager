"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { createDepartment } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useFormAction } from "@/hooks/useFormAction";

interface AddDepartmentFormProps {
  onOptimisticAdd?: (name: string, description: string) => void;
}

const AddDepartmentForm: React.FC<AddDepartmentFormProps> = ({ onOptimisticAdd }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const isValid = name.trim().length > 0;

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      onOptimisticAdd?.(
        formData.get("name") as string,
        (formData.get("description") as string) || "",
      );
      completeTutorialStep("create_department");
      return createDepartment(formData);
    },
    { successMessage: tn("departmentCreated") },
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
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
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
      <Box sx={formButtonContainerStyles}>
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
