"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { updatePersonName } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";

const UpdatePersonNameForm: React.FC<{ personID: string; currentName: string }> = ({
  personID,
  currentName,
}) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [newName, setNewName] = useState(currentName);
  const isChanged = newName.trim() !== currentName;
  const isValid = newName.trim().length > 0 && isChanged;
  const router = useRouter();

  const [state, formAction, isPending] = useFormAction(updatePersonName, {
    successMessage: tn("nameUpdated"),
    onSuccess: () => router.push("/managePersons"),
  });

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h6">{t("changeName")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="personID" value={personID} />
      <Tooltip title={tc("required")} placement="right" arrow>
        <TextField
          label={t("enterNewName")}
          name="name"
          size="small"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
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

export default UpdatePersonNameForm;
