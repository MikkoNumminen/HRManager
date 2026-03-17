import { Box } from "@mui/material";
import PersonTable from "@/components/EditablePersonsTable";
import AddPersonForm from "@/components/AddPeople";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getPersons } from "@/queries";

export default async function ManagePersonsPage() {
  const persons = await getPersons();

  return (
    <>
      <TopBar title="Manage Persons" backHref="/" />
      <Box mb={4}>
        <AddPersonForm />
      </Box>
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <PersonTable persons={persons} />
      </Box>
    </>
  );
}
