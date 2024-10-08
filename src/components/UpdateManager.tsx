"use client";

import { addManager, getPersons } from "@/serverActions";
import { collectedPageForm, header } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";
import { smallButtonStyles } from "@/muiStyles";

const UpdateManagerForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const [newManager, setNewManager] = useState<string>(""); // State for selected manager ID
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [errorPersons, setErrorPersons] = useState<string | null>(null);
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

    try {
      if (!newManager) {
        alert("Please select a manager.");
        return;
      }

      const formData = new FormData();
      formData.set("teamID", teamID);
      formData.set("personID", newManager);

      await addManager(formData);

      // After successful update, navigate to the desired route
      router.push(`/manageTeams`);
    } catch (error) {
      console.error("Error updating manager:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <header className={header}>
        <Typography variant="h4">Add Manager to Team</Typography>
      </header>

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
                onSelect={(personID: string) => setNewManager(personID)} // Set new manager ID
              />
            ))}
          </ul>
        )}
      </Box>

      <Box display="flex" gap={1} justifyContent="flex-end">
        <Link href={`/manageTeams`} sx={smallButtonStyles}>
          Cancel
        </Link>
        <Button type="submit" sx={smallButtonStyles}>
          Add Manager
        </Button>
      </Box>
    </form>
  );
};

export default UpdateManagerForm;
