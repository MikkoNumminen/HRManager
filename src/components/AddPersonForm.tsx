"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { createPerson } from "@/features/persons/actions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useFormAction } from "@/hooks/useFormAction";

interface AddPersonFormProps {
  onOptimisticAdd?: (name: string, email: string) => void;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ onOptimisticAdd }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      onOptimisticAdd?.(formData.get("name") as string, formData.get("email") as string);
      completeTutorialStep("add_person");
      return createPerson(formData);
    },
    { successMessage: tn("personCreated") },
  );

  useEffect(() => {
    if (state.success) {
      setName("");
      setEmail("");
    }
  }, [state]);

  return (
    <Box component="form" action={formAction} sx={formStyles} data-tutorial="add-person-form">
      <Typography variant="h5">{t("addPerson")}</Typography>
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
      <Tooltip title={tc("requiredEmail")} placement="right" arrow>
        <TextField
          label={t("enterEmail")}
          name="email"
          type="email"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
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

export default AddPersonForm;
