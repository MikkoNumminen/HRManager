"use client";

import { addMember } from "@/features/teams/actions";
import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  headerStyles,
  personSelectGridSx,
  smallButtonStyles,
} from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useFormAction } from "@/hooks/useFormAction";
import { PersonSelectCard } from "@/features/persons/components/PersonSelectCard";
import { Person } from "@/schemas";

const AddMemberForm: React.FC<{ teamID: string; persons: Person[]; excludeIds?: string[] }> = ({
  teamID,
  persons,
  excludeIds = [],
}) => {
  const t = useTranslations("teams");

  const tn = useTranslations("notifications");
  const [selectedMember, setSelectedMember] = useState<string>("");

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      completeTutorialStep("add_member");
      return addMember(formData);
    },
    { successMessage: tn("memberAdded") },
  );

  const filteredPersons = persons.filter((p) => !excludeIds.includes(p.id));

  return (
    <Box component="form" action={formAction} sx={formStyles} data-tutorial="add-member-form">
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("addMember")}</Typography>
      </Box>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={selectedMember} />

      <Box sx={personSelectGridSx}>
        {filteredPersons.map((p) => (
          <PersonSelectCard
            key={p.id}
            person={p}
            selected={selectedMember === p.id}
            onSelect={setSelectedMember}
            variant="add"
          />
        ))}
      </Box>

      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!selectedMember || isPending}
          sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}
        >
          {t("addMemberButton")}
        </Button>
      </Box>
    </Box>
  );
};

export default AddMemberForm;
