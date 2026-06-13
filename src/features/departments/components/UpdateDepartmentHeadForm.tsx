"use client";

import { updateDepartmentHead } from "@/features/departments/actions";
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

const UpdateDepartmentHeadForm: React.FC<{
  departmentID: string;
  persons: Person[];
  excludeIds?: string[];
}> = ({ departmentID, persons, excludeIds = [] }) => {
  const t = useTranslations("departments");

  const tn = useTranslations("notifications");
  const [newHead, setNewHead] = useState<string>("");

  const [state, formAction, isPending] = useFormAction(updateDepartmentHead, {
    successMessage: tn("departmentHeadUpdated"),
  });

  const filteredPersons = persons.filter((p) => !excludeIds.includes(p.id));

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("setHead")}</Typography>
      </Box>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="departmentID" value={departmentID} />
      <input type="hidden" name="personID" value={newHead} />

      <Box sx={personSelectGridSx}>
        {filteredPersons.map((p) => (
          <PersonSelectCard
            key={p.id}
            person={p}
            selected={newHead === p.id}
            onSelect={setNewHead}
            variant="add"
          />
        ))}
      </Box>

      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!newHead || isPending}
          sx={{ ...smallButtonStyles, ...(newHead && activeButtonStyles) }}
        >
          {t("setHeadButton")}
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateDepartmentHeadForm;
