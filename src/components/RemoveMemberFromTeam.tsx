"use client";

import { removeMember } from "@/features/teams/actions";
import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  headerStyles,
  personSelectGridSx,
  smallButtonStyles,
} from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";
import { PersonSelectCard } from "./PersonSelectCard";
import { Person } from "@/schemas";
import ConfirmDialog from "./ConfirmDialog";

const RemoveMemberForm: React.FC<{
  teamID: string;
  persons: Person[];
  includeOnlyIds?: string[];
}> = ({ teamID, persons, includeOnlyIds }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useFormAction(removeMember, {
    successMessage: tn("memberRemoved"),
  });

  const filteredPersons = persons.filter((p) => !includeOnlyIds || includeOnlyIds.includes(p.id));
  const selectedName = filteredPersons.find((p) => p.id === selectedMember)?.name;

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("removeMember")}</Typography>
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
            variant="remove"
          />
        ))}
      </Box>

      <Box sx={formButtonContainerStyles}>
        <Button
          disabled={!selectedMember || isPending}
          onClick={() => setDialogOpen(true)}
          sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}
        >
          {t("removeMemberButton")}
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title={t("removeMember")}
        message={t("removeMemberConfirm", { name: selectedName ?? t("removeMemberDefault") })}
        confirmLabel={tc("remove")}
        onConfirm={() => {
          setDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </Box>
  );
};

export default RemoveMemberForm;
