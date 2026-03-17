"use client";

import { addMember } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { PersonSelectCard } from "./PersonSelectCard";
import { Person } from "@/schemas";

type FormState = { error: string | null };

const AddMemberForm: React.FC<{ teamID: string; persons: Person[]; excludeIds?: string[] }> = ({
  teamID,
  persons,
  excludeIds = [],
}) => {
  const [selectedMember, setSelectedMember] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await addMember(formData);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "An error occurred" };
      }
    },
    { error: null },
  );

  const filteredPersons = persons.filter((p) => !excludeIds.includes(p.id));

  return (
    <Box component="form" action={formAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Add Member to Team</Typography>
      </Box>
      {state.error && <Typography color="error">{state.error}</Typography>}

      <input type="hidden" name="teamID" value={teamID} />
      <input type="hidden" name="personID" value={selectedMember} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 1,
          mb: 1,
        }}
      >
        {filteredPersons.map((p) => (
          <PersonSelectCard
            key={p.id}
            person={p}
            selected={selectedMember === p.id}
            onSelect={setSelectedMember}
            variant="add"
          />
        ))}
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button
          type="submit"
          disabled={!selectedMember || isPending}
          sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}
        >
          Add Member
        </Button>
      </Box>
    </Box>
  );
};

export default AddMemberForm;
