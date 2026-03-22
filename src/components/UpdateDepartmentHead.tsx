"use client";

import { updateDepartmentHead } from "@/serverActions";
import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  headerStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { PersonSelectCard } from "./PersonSelectCard";
import { Person } from "@/schemas";

type FormState = { error: string | null };

const UpdateDepartmentHeadForm: React.FC<{
  departmentID: string;
  persons: Person[];
  excludeIds?: string[];
}> = ({ departmentID, persons, excludeIds = [] }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [newHead, setNewHead] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updateDepartmentHead(formData);
        showSnackbar(tn("departmentHeadUpdated"));
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
        <Typography variant="h6">{t("setHead")}</Typography>
      </Box>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}

      <input type="hidden" name="departmentID" value={departmentID} />
      <input type="hidden" name="personID" value={newHead} />

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
