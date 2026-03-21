"use client";

import { activeButtonStyles, formStyles, smallButtonStyles, textFieldStyles } from "@/muiStyles";
import { updatePosition } from "@/serverActions";
import { Box, Button, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null };

const UpdatePositionForm: React.FC<{ personID: string; currentPosition?: string }> = ({
  personID,
  currentPosition,
}) => {
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
      try {
        await updatePosition(formData);
        showSnackbar(tn("positionUpdated"));
        router.push("/managePersons");
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">{t("changePosition")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="personID" value={personID} />
      <Tooltip title={tc("required")} placement="right" arrow>
        <TextField
          label={t("enterNewPosition")}
          name="name"
          size="small"
          value={newPosition}
          onChange={(e) => setNewPosition(e.target.value)}
          sx={textFieldStyles}
        />
      </Tooltip>
      <Box display="flex" gap={1} justifyContent="flex-end">
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
