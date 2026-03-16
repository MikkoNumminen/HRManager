import { Box, Typography } from "@mui/material";
import PersonTable from "@/components/EditablePersonsTable";
import AddPersonForm from "@/components/AddPeople";
import { getPersons } from "@/queries";

export default async function ManagePersonsPage() {
  const persons = await getPersons();

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage Persons
      </Typography>
      <Box mb={4}>
        <AddPersonForm />
      </Box>
      <PersonTable persons={persons} />
    </>
  );
}
