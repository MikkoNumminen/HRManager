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
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";
import { CombinedTeam } from "@/schemas";

const RemoveTeamFromDepartmentForm: React.FC<{
  currentTeams: CombinedTeam[];
}> = ({ currentTeams }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const [state, formAction, isPending] = useFormAction(removeTeamFromDepartment, {
    successMessage: tn("teamRemovedFromDepartment"),
  });

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
