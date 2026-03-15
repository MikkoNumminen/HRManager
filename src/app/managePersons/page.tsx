// TODO: Maby serverside? Fix tests?
// TODO: In manage persons, change color of the buttons if all of the data is not filled in
"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import PersonTable from "@/components/EditablePersonsTable";
import AddPersonForm from "@/components/AddPeople";
import { getPersons } from "@/serverActions";
import { Person } from "@prisma/client";

const ManagePersonsPage: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const data = await getPersons();
      setPersons(data);
    } catch (err) {
      console.error("Failed to fetch persons:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []); // Empty dependency array means this will run once when the component mounts

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage Persons
      </Typography>
      <Box mb={4}>
        <AddPersonForm onSuccess={fetchPersons} />
      </Box>
      <PersonTable persons={persons} />
    </>
  );
};

export default ManagePersonsPage;
