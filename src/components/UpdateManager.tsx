"use client";

import { addManager } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";

type FormState = { error: string | null };

const UpdateManagerForm: React.FC<{ teamID: string; persons: Person[]; showCancel?: boolean; excludeIds?: string[] }> = ({ teamID, persons, showCancel = true, excludeIds = [] }) => {
  const [newManager, setNewManager] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await addManager(formData);
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
        <Typography variant="h5">Add Manager to Team</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={newManager} />

      <Box sx={{ pl: 1, mb: 1 }}>
        <Typography variant="body2">Select Manager</Typography>
        <Box>
          {persons.filter((p) => !excludeIds.includes(p.id)).map((p) => (
            <PersonCheckBoxList
              key={p.id}
              {...p}
              groupName="addManager-personID"
              selectedId={newManager}
              onSelect={(personID: string) => setNewManager(personID)}
            />
          ))}
        </Box>
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!newManager || isPending} sx={{ ...smallButtonStyles, ...(newManager && activeButtonStyles) }}>
          Add Manager
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateManagerForm;
