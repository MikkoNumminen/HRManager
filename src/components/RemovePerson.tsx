"use client";

import { formStyles, smallButtonStyles } from "@/muiStyles";
import { removePerson } from "@/serverActions";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

type FormState = { error: string | null };

const RemovePersonForm: React.FC<{ personID: string; showCancel?: boolean }> = ({ personID, showCancel = true }) => {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removePerson(formData);
        router.push("/managePersons");
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Typography variant="h5">Remove Person</Typography>
      {state.error && <Typography color="error">{state.error}</Typography>}
      <input type="hidden" name="personID" value={personID} />
      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/managePersons`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={isPending} sx={smallButtonStyles}>
          Remove
        </Button>
      </Box>
    </Box>
  );
};

export default RemovePersonForm;
