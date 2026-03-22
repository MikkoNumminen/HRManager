"use client";

import { formButtonContainerStyles, formStyles, smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null };

const RemoveTeamForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeTeam(formData);
        showSnackbar(tn("teamRemoved"));
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">{t("removeTeam")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="teamID" value={teamID} />
      <Box sx={formButtonContainerStyles}>
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          {tc("remove")}
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title={t("removeTeam")}
        message={t("removeConfirm")}
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

export default RemoveTeamForm;
