"use client";

import { formButtonContainerStyles, formStyles, smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null };

const RemovePersonForm: React.FC<{ personID: string }> = ({ personID }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removePerson(formData);
        showSnackbar(tn("personRemoved"));
        router.push("/managePersons");
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">{t("removePerson")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="personID" value={personID} />
      <Box sx={formButtonContainerStyles}>
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          {tc("remove")}
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title={t("removePerson")}
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

export default RemovePersonForm;
