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
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UpdateEmailForm: React.FC<{ personID: string; currentEmail?: string }> = ({
  personID,
  currentEmail,
}) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [newEmail, setNewEmail] = useState(currentEmail ?? "");
  const isChanged = newEmail.trim() !== (currentEmail ?? "");
  const isValid = EMAIL_REGEX.test(newEmail.trim()) && isChanged;
  const router = useRouter();

  const [state, formAction, isPending] = useFormAction(updateEmail, {
    successMessage: tn("emailUpdated"),
    onSuccess: () => router.push("/managePersons"),
  });

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
