"use client";

import { addManager } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";

const UpdateManagerForm: React.FC<{ teamID: string; persons: Person[]; showCancel?: boolean; excludeIds?: string[] }> = ({ teamID, persons, showCancel = true, excludeIds = [] }) => {
  const [newManager, setNewManager] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("teamID", teamID);
      formData.set("personID", newManager);

      await addManager(formData);

      router.push(`/manageTeams`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Add Manager to Team</Typography>
      </Box>
      {submitError && <Typography color="error">{submitError}</Typography>}

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
        <Button type="submit" disabled={!newManager} sx={{ ...smallButtonStyles, ...(newManager && activeButtonStyles) }}>
          Add Manager
        </Button>
      </Box>
    </Box>
  );
};

export default UpdateManagerForm;
