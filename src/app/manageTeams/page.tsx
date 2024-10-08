"use client";

import { header } from "@/tailwindStyles";
import { getPersons, getTeams } from "@/serverActions";
import { useEffect, useState } from "react";
import { Person, Team } from "@prisma/client"; // Oletan että Team-mallisi on Prisma Clientissä
import { Box, Typography } from "@mui/material";

import AddTeamForm from "@/components/AddTeam";
import EditableTeamsTable from "@/components/EditableTeamsTable";

const ManageTeamsPage: React.FC = () => {
  // State for persons
  const [persons, setPersons] = useState<Person[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [errorPersons, setErrorPersons] = useState<string | null>(null);

  // State for teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [errorTeams, setErrorTeams] = useState<string | null>(null);

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
  }, []); // Empty dependency array means this will run once when the component mounts

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const data = await getTeams();
        setTeams(data);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
        setErrorTeams("Failed to fetch data");
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []); // Empty dependency array means this will run once when the component mounts

  if (loadingPersons || loadingTeams)
    return <Typography>Loading...</Typography>;
  if (errorPersons)
    return <Typography color="error">{errorPersons}</Typography>;
  if (errorTeams) return <Typography color="error">{errorTeams}</Typography>;

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage Teams
      </Typography>
      <Box mb={4}>
        <AddTeamForm />
      </Box>
      <EditableTeamsTable combinedTeams={teams} />
    </>
  );
};

export default ManageTeamsPage;
