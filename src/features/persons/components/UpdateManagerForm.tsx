"use client";

import { addManager } from "@/features/persons/actions";
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
import { useFormAction } from "@/hooks/useFormAction";
import { PersonSelectCard } from "@/components/shared/PersonSelectCard";
import { Person } from "@/schemas";

const UpdateManagerForm: React.FC<{ teamID: string; persons: Person[]; excludeIds?: string[] }> = ({
  teamID,
  persons,
  excludeIds = [],
}) => {
  const t = useTranslations("teams");

  const tn = useTranslations("notifications");
  const [newManager, setNewManager] = useState<string>("");

  const [state, formAction, isPending] = useFormAction(addManager, {
    successMessage: tn("managerUpdated"),
  });

  const filteredPersons = persons.filter((p) => !excludeIds.includes(p.id));

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("addManager")}</Typography>
      </Box>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={newManager} />

      <Box sx={personSelectGridSx}>
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

      <Box sx={formButtonContainerStyles}>
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
