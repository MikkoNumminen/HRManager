"use client";

import { removeMember } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { PersonSelectCard } from "./PersonSelectCard";
import { Person } from "@/schemas";
import ConfirmDialog from "./ConfirmDialog";

type FormState = { error: string | null };

const RemoveMemberForm: React.FC<{
  teamID: string;
  persons: Person[];
  includeOnlyIds?: string[];
}> = ({ teamID, persons, includeOnlyIds }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeMember(formData);
        showSnackbar(tn("memberRemoved"));
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  const filteredPersons = persons.filter((p) => !includeOnlyIds || includeOnlyIds.includes(p.id));
  const selectedName = filteredPersons.find((p) => p.id === selectedMember)?.name;

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">{t("removeMember")}</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={selectedMember} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 1,
          mb: 1,
        }}
      >
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

      <Box display="flex" gap={1} justifyContent="flex-end">
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
