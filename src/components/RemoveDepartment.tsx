"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removeDepartment } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import { useSnackbar } from "./SnackbarProvider";

type FormState = { error: string | null };

const RemoveDepartmentForm: React.FC<{ departmentID: string }> = ({ departmentID }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeDepartment(formData);
        showSnackbar(tn("departmentRemoved"));
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">{t("removeDepartment")}</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="departmentID" value={departmentID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button disabled={isPending} onClick={() => setDialogOpen(true)} sx={smallButtonStyles}>
          {tc("remove")}
        </Button>
      </Box>
      <ConfirmDialog
        open={dialogOpen}
        title={t("removeDepartment")}
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

export default RemoveDepartmentForm;
