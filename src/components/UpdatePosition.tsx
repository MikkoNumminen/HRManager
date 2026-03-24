"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import type { Position } from "@/schemas";

type FormState = { error: string | null };

const UpdatePositionForm: React.FC<{
  personID: string;
  currentPosition?: string;
  positions: Position[];
}> = ({ personID, currentPosition, positions }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [newPosition, setNewPosition] = useState(currentPosition ?? "");
  const isChanged = newPosition.trim() !== (currentPosition ?? "");
  const isValid = newPosition.trim().length > 0 && isChanged;
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updatePosition(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("positionUpdated"));
      router.push("/managePersons");
      return { error: null };
    },
    { error: null },
  );

  const positionOptions = positions.map((p) => p.name);

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">{t("changePosition")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="personID" value={personID} />
      <input type="hidden" name="position" value={newPosition} />
      <Autocomplete
        freeSolo
        options={positionOptions}
        value={newPosition}
        onInputChange={(_e, value) => setNewPosition(value)}
        renderInput={(params) => (
          <TextField {...params} label={t("enterNewPosition")} size="small" sx={textFieldStyles} />
        )}
      />
      <Box sx={formButtonContainerStyles}>
        <Button
          type="submit"
          disabled={!isValid || isPending}
          sx={{ ...smallButtonStyles, ...(isValid && activeButtonStyles) }}
        >
          {tc("change")}
        </Button>
      </Box>
    </Box>
  );
};

export default UpdatePositionForm;
