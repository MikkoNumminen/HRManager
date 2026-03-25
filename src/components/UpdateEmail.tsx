"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { updateEmail } from "@/features/persons/actions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = { error: string | null };

const UpdateEmailForm: React.FC<{ personID: string; currentEmail?: string }> = ({
  personID,
  currentEmail,
}) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [newEmail, setNewEmail] = useState(currentEmail ?? "");
  const isChanged = newEmail.trim() !== (currentEmail ?? "");
  const isValid = EMAIL_REGEX.test(newEmail.trim()) && isChanged;
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateEmail(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("emailUpdated"));
      router.push("/managePersons");
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">{t("changeEmail")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="personID" value={personID} />
      <Tooltip title={tc("requiredEmail")} placement="right" arrow>
        <TextField
          label={t("enterNewEmail")}
          name="email"
          type="email"
          size="small"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          helperText={!currentEmail ? tc("noEmailSet") : undefined}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!isValid || isPending}
          sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}
        >
          {tc("change")}
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateEmailForm;
