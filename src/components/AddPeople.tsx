"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { createPerson } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null; success: boolean };

const AddPersonForm: React.FC = () => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = name.trim().length > 0 && EMAIL_REGEX.test(email.trim());

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await createPerson(formData);
        completeTutorialStep("add_person");
        showSnackbar(tn("personCreated"));
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

export default AddPersonForm;
