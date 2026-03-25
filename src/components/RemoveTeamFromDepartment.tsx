"use client";

import { removeTeamFromDepartment } from "@/features/departments/actions";
import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { CombinedTeam } from "@/schemas";

type FormState = { error: string | null };

const RemoveTeamFromDepartmentForm: React.FC<{
  currentTeams: CombinedTeam[];
}> = ({ currentTeams }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await removeTeamFromDepartment(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("teamRemovedFromDepartment"));
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">{t("removeTeam")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="teamID" value={selectedTeam} />

      <TextField
        select
        label={t("selectTeam")}
        size="small"
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        sx={textFieldStyles}
      >
        {currentTeams.map((t) => (
          <MenuItem key={t.teamId} value={t.teamId}>
            {t.teamName}
          </MenuItem>
        ))}
      </TextField>

      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!selectedTeam || isPending}
          sx={{ ...smallButtonStyles, ...(selectedTeam && activeButtonStyles) }}
        >
          {tc("remove")}
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveTeamFromDepartmentForm;
