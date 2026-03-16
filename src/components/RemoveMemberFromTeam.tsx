"use client";

import { removeMember } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";

type FormState = { error: string | null };

const RemoveMemberForm: React.FC<{ teamID: string; persons: Person[]; showCancel?: boolean; includeOnlyIds?: string[] }> = ({ teamID, persons, showCancel = true, includeOnlyIds }) => {
  const [selectedMember, setSelectedMember] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await removeMember(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Remove Member from Team</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={selectedMember} />

      <Box sx={{ pl: 1, mb: 1 }}>
        <Typography variant="body2">Select Member</Typography>
        <Box>
          {persons.filter((p) => !includeOnlyIds || includeOnlyIds.includes(p.id)).map((p) => (
            <PersonCheckBoxList
              key={p.id}
              {...p}
              groupName="removeMember-personID"
              selectedId={selectedMember}
              onSelect={(personID: string) => setSelectedMember(personID)}
            />
          ))}
        </Box>
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!selectedMember || isPending} sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}>
          Remove Member
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveMemberForm;
