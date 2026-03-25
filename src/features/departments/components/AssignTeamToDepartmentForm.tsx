"use client";

import { assignTeamToDepartment } from "@/features/departments/actions";
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
import { completeTutorialStep } from "@/tutorialConfig";
import { useFormAction } from "@/hooks/useFormAction";
import { CombinedTeam } from "@/schemas";

const AssignTeamToDepartmentForm: React.FC<{
  departmentID: string;
  availableTeams: CombinedTeam[];
}> = ({ departmentID, availableTeams }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      completeTutorialStep("assign_team_to_department");
      return assignTeamToDepartment(formData);
    },
    { successMessage: tn("teamAssigned") },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles} data-tutorial="assign-team-form">
      <Typography variant="h5">{t("assignTeam")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="departmentID" value={departmentID} />
      <input type="hidden" name="teamID" value={selectedTeam} />

      <TextField
        select
        label={t("selectTeam")}
        size="small"
        fullWidth
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        sx={textFieldStyles}
      >
        {availableTeams.map((t) => (
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
          {tc("assign")}
        </Button>
      </Box>
    </Box>
  );
};

export default AssignTeamToDepartmentForm;
