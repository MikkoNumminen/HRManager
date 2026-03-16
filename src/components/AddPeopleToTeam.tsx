"use client";

import { addMember } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";

const AddMemberForm: React.FC<{ teamID: string; persons: Person[]; showCancel?: boolean; excludeIds?: string[] }> = ({ teamID, persons, showCancel = true, excludeIds = [] }) => {
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("teamID", teamID);
      formData.set("personID", selectedMember);

      await addMember(formData);

      router.push(`/manageTeams`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Add Member to Team</Typography>
      </Box>
      {submitError && <Typography color="error">{submitError}</Typography>}

      <Box sx={{ pl: 1, mb: 1 }}>
        <Typography variant="body2">Select Member</Typography>
        <Box>
          {persons.filter((p) => !excludeIds.includes(p.id)).map((p) => (
            <PersonCheckBoxList
              key={p.id}
              {...p}
              groupName="addMember-personID"
              selectedId={selectedMember}
              onSelect={(personID: string) => setSelectedMember(personID)}
            />
          ))}
        </Box>
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!selectedMember} sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}>
          Add Member
        </Button>
      </Box>
    </Box>
  );
};

export default AddMemberForm;
