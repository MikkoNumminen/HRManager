"use client";

import { formButtonContainerStyles, formStyles, smallButtonStyles } from "@/muiStyles";
import { removeTeam } from "@/features/teams/actions";
import { Box, Button, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import DeleteImpactList from "./DeleteImpactList";
import { useFormAction } from "@/hooks/useFormAction";
import type { TeamDeleteImpact } from "@/constants";

const RemoveTeamForm: React.FC<{
  teamID: string;
  impact?: TeamDeleteImpact;
}> = ({ teamID, impact }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const ti = useTranslations("deleteImpact");
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useFormAction(removeTeam, {
    successMessage: tn("teamRemoved"),
  });

  const impacts = impact
    ? [
        {
          label: ti("teamMembers", { count: impact.memberCount }),
          items: impact.memberCount > 0 ? [ti("memberCount", { count: impact.memberCount })] : [],
        },
        {
          label: ti("departmentAssignment"),
          items: impact.departmentName ? [impact.departmentName] : [],
        },
      ]
    : [];

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
      >
        <DeleteImpactList impacts={impacts} />
      </ConfirmDialog>
    </Box>
  );
};

export default RemoveTeamForm;
