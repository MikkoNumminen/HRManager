"use client";

import {
  activeButtonStyles,
  formButtonContainerStyles,
  formStyles,
  smallButtonStyles,
  textFieldStyles,
} from "@/muiStyles";
import { updatePosition } from "@/features/persons/actions";
import { Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormAction } from "@/hooks/useFormAction";
import type { Position } from "@/schemas";

const UpdatePositionForm: React.FC<{
  personID: string;
  currentPosition?: string;
  positions: Position[];
}> = ({ personID, currentPosition, positions }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [newPosition, setNewPosition] = useState(currentPosition ?? "");
  const isChanged = newPosition.trim() !== (currentPosition ?? "");
  const isValid = newPosition.trim().length > 0 && isChanged;
  const router = useRouter();

  const [state, formAction, isPending] = useFormAction(updatePosition, {
    successMessage: tn("positionUpdated"),
    onSuccess: () => router.push("/managePersons"),
  });

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
