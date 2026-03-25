"use client";

import { formButtonContainerStyles, formStyles, smallButtonStyles } from "@/muiStyles";
import { removeDepartment } from "@/serverActions";
import { Box, Button, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import DeleteImpactList from "./DeleteImpactList";
import { useFormAction } from "@/hooks/useFormAction";
import type { DepartmentDeleteImpact } from "@/constants";

const RemoveDepartmentForm: React.FC<{
  departmentID: string;
  impact?: DepartmentDeleteImpact;
}> = ({ departmentID, impact }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const ti = useTranslations("deleteImpact");
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useFormAction(removeDepartment, {
    successMessage: tn("departmentRemoved"),
  });

  const impacts = impact
    ? [
        {
          label: ti("assignedTeams", { count: impact.teams.length }),
          items: impact.teams.map((t) => t.teamName),
        },
      ]
    : [];

  return (
    <Box component="form" action={formAction} ref={formRef} sx={formStyles}>
      <Typography variant="h5">{t("removeDepartment")}</Typography>
      {state.error && (
        <Typography color="error" role="alert">
          {state.error}
        </Typography>
      )}
      <input type="hidden" name="departmentID" value={departmentID} />
      <Box sx={formButtonContainerStyles}>
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
      >
        <DeleteImpactList impacts={impacts} />
      </ConfirmDialog>
    </Box>
  );
};

export default RemoveDepartmentForm;
