"use client";

import { removeMember, getPersons } from "@/serverActions";
import { activeButtonStyles, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";

const RemoveMemberForm: React.FC<{ teamID: string; showCancel?: boolean; includeOnlyIds?: string[] }> = ({ teamID, showCancel = true, includeOnlyIds }) => {
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [errorPersons, setErrorPersons] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        setLoadingPersons(true);
        const data = await getPersons();
        setPersons(data);
      } catch (err) {
        console.error("Failed to fetch persons:", err);
        setErrorPersons("Failed to fetch data");
      } finally {
        setLoadingPersons(false);
      }
    };

    fetchPersons();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("teamID", teamID);
      formData.set("personID", selectedMember);

      await removeMember(formData);

      router.push(`/manageTeams`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Remove Member from Team</Typography>
      </Box>
      {submitError && <Typography color="error">{submitError}</Typography>}

      <Box sx={{ pl: 1, mb: 1 }}>
        <Typography variant="body2">Select Member</Typography>
        {loadingPersons ? (
          <Typography>Loading...</Typography>
        ) : errorPersons ? (
          <Typography>{errorPersons}</Typography>
        ) : (
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
        )}
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        {showCancel && <Link href={`/manageTeams`} sx={smallButtonStyles}>Cancel</Link>}
        <Button type="submit" disabled={!selectedMember} sx={{ ...smallButtonStyles, ...(selectedMember && activeButtonStyles) }}>
          Remove Member
        </Button>
      </Box>
    </Box>
  );
};

export default RemoveMemberForm;
