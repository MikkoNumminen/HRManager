"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { createTeam } from "@/features/teams/actions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null; success: boolean };

interface AddTeamFormProps {
  onOptimisticAdd?: (teamName: string) => void;
}

const AddTeamForm: React.FC<AddTeamFormProps> = ({ onOptimisticAdd }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState("");
  const isValid = name.trim().length > 0;

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      onOptimisticAdd?.(formData.get("name") as string);
      completeTutorialStep("create_team");
      const result = await createTeam(formData);
      if (result?.error) return { error: result.error, success: false };
      showSnackbar(tn("teamCreated"));
      return { error: null, success: true };
    },
    { error: null, success: false },
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
