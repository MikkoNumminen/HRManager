"use client";

import { addManager, getPersons } from "@/serverActions";
import { collectedPageForm, header } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";
import { activeButtonStyles, smallButtonStyles } from "@/muiStyles";

const UpdateManagerForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const [newManager, setNewManager] = useState<string>("");
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [errorPersons, setErrorPersons] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch persons on component mount
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
      formData.set("personID", newManager);

      await addManager(formData);

      router.push(`/manageTeams`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <header className={header}>
        <Typography variant="h4">Add Manager to Team</Typography>
      </header>
      {submitError && <Typography color="error">{submitError}</Typography>}

      <Box className="pl-2 mb-2">
        <Typography>Select Manager</Typography>
        {loadingPersons ? (
          <Typography>Loading...</Typography>
        ) : errorPersons ? (
          <Typography>{errorPersons}</Typography>
        ) : (
          <ul>
            {persons.map((p) => (
              <PersonCheckBoxList
                key={p.id}
                {...p}
                groupName="addManager-personID"
                selectedId={newManager}
                onSelect={(personID: string) => setNewManager(personID)}
              />
            ))}
          </ul>
        )}
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/manageTeams`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" disabled={!newManager} sx={{ ...smallButtonStyles, ...(newManager && activeButtonStyles) }}>
          Add Manager
        </Button>
      </Box>
    </form>
  );
};

export default UpdateManagerForm;
