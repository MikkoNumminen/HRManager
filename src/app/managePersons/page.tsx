import { Box, Typography } from "@mui/material";
import PersonTable from "@/components/EditablePersonsTable";
import AddPersonForm from "@/components/AddPeople";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getPersons } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ManagePersonsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const persons = await getPersons();

  return (
    <>
      <TopBar title="Manage Persons" backHref="/" />
      <AddPersonForm />
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <Typography variant="h5" mb={1}>Persons</Typography>
        <PersonTable persons={persons} />
      </Box>
    </>
  );
}
