"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { updateDepartment } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";

const UpdateDepartmentForm: React.FC<{
  departmentID: string;
  currentName: string;
  currentDescription: string | null;
}> = ({ departmentID, currentName, currentDescription }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? "");
  const isChanged =
    name.trim() !== currentName || description.trim() !== (currentDescription ?? "");
  const isValid = name.trim().length > 0 && isChanged;

  const [state, formAction, isPending] = useFormAction(updateDepartment, {
    successMessage: tn("departmentUpdated"),
  });

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h6">{t("editDepartment")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="departmentID" value={departmentID} />
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
        multiline
        minRows={2}
      />
      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!isValid || isPending}
          sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}
        >
          {tc("save")}
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateDepartmentForm;
