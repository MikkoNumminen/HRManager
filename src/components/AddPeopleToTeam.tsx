"use client";

import { addMember, getPersons } from "@/serverActions";
import { collectedPageForm, header } from "@/tailwindStyles";
import { Box, Button, Link, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonCheckBoxList } from "./PersonCheckboxList";
import { Person } from "@prisma/client";
import { smallButtonStyles } from "@/muiStyles";

const AddMemberForm: React.FC<{ teamID: string }> = ({ teamID }) => {
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [errorPersons, setErrorPersons] = useState<string | null>(null);
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

    try {
      if (!selectedMember) {
        alert("Please select a member.");
        return;
      }

      const formData = new FormData();
      formData.set("teamID", teamID);
      formData.set("personID", selectedMember);

      await addMember(formData);

      router.push(`/manageTeams`);
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={collectedPageForm}>
      <header className={header}>
        <Typography variant="h4">Add Member to Team</Typography>
      </header>

      <Box className="pl-2 mb-2">
        <Typography>Select Member</Typography>
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
                onSelect={(personID: string) => setSelectedMember(personID)}
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
          Add Member
        </Button>
      </Box>
    </form>
  );
};

export default AddMemberForm;
