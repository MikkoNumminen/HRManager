"use client";

import { addManager } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { PersonSelectCard } from "./PersonSelectCard";
import { Person } from "@/schemas";

type FormState = { error: string | null };

const UpdateManagerForm: React.FC<{ teamID: string; persons: Person[]; excludeIds?: string[] }> = ({
  teamID,
  persons,
  excludeIds = [],
}) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [newManager, setNewManager] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await addManager(formData);
        showSnackbar(tn("managerUpdated"));
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  const filteredPersons = persons.filter((p) => !excludeIds.includes(p.id));

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">{t("addManager")}</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={newManager} />

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
            selected={newManager === p.id}
            onSelect={setNewManager}
            variant="add"
          />
        ))}
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          type="submit"
          disabled={!newManager || isPending}
          sx={{ ...smallButtonStyles, ...(newManager && activeButtonStyles) }}
        >
          {t("addManagerButton")}
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateManagerForm;
