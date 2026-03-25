"use client";

import { formButtonContainerStyles, formStyles, smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/features/persons/actions";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ConfirmDialog from "./ConfirmDialog";
import DeleteImpactList from "./DeleteImpactList";
import { useFormAction } from "@/hooks/useFormAction";
import type { PersonDeleteImpact } from "@/constants";

const RemovePersonForm: React.FC<{
  personID: string;
  impact?: PersonDeleteImpact;
}> = ({ personID, impact }) => {
  const t = useTranslations("persons");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const ti = useTranslations("deleteImpact");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [state, formAction, isPending] = useFormAction(removePerson, {
    successMessage: tn("personRemoved"),
    onSuccess: () => router.push("/managePersons"),
  });

  const impacts = impact
    ? [
        {
          label: ti("managedTeams", { count: impact.managedTeams.length }),
          items: impact.managedTeams.map((t) => t.teamName),
        },
        {
          label: ti("headedDepartments", { count: impact.headedDepartments.length }),
          items: impact.headedDepartments.map((d) => d.name),
        },
        {
          label: ti("teamMemberships", { count: impact.teamMemberships.length }),
          items: impact.teamMemberships.map((t) => t.teamName),
        },
        {
          label: ti("leaveRequests", { count: impact.leaveRequests }),
          items:
            impact.leaveRequests > 0
              ? [ti("leaveRequestCount", { count: impact.leaveRequests })]
              : [],
        },
        {
          label: ti("reviewRequests", { count: impact.reviewRequests }),
          items:
            impact.reviewRequests > 0
              ? [ti("reviewRequestCount", { count: impact.reviewRequests })]
              : [],
        },
      ]
    : [];

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
      >
        <DeleteImpactList impacts={impacts} />
      </ConfirmDialog>
    </Box>
  );
};

export default RemovePersonForm;
