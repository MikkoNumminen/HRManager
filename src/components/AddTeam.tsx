"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { createTeam } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useFormAction } from "@/hooks/useFormAction";

interface AddTeamFormProps {
  onOptimisticAdd?: (teamName: string) => void;
}

const AddTeamForm: React.FC<AddTeamFormProps> = ({ onOptimisticAdd }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [name, setName] = useState("");
  const isValid = name.trim().length > 0;

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      onOptimisticAdd?.(formData.get("name") as string);
      completeTutorialStep("create_team");
      return createTeam(formData);
    },
    { successMessage: tn("teamCreated") },
  );

  useEffect(() => {
    if (state.success) {
      setName("");
    }
  }, [state]);

  return (
    <Box component="form" action={formAction} sx={formStyles} data-tutorial="add-team-form">
      <Typography variant="h5">{t("addTeam")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <Tooltip title={tc("required")} placement="right" arrow>
        <TextField
          label={t("enterTeamName")}
          name="name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

export default AddTeamForm;
