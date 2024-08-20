import RemovePersonForm from "@/components/RemovePerson";
import UpdateEmailForm from "@/components/UpdateEmail";
import UpdatePositionForm from "@/components/UpdatePosition";
import { getPersons } from "@/serverActions";
import { Box, Typography } from "@mui/material";

export default async function PersonPage({
  params,
}: {
  params: { personId: string };
}) {
  const persons = await getPersons(); // TODO: getPersons(personId)
  const person = persons.find((p) => p.id === params.personId);

  if (!person) {
    return <Typography variant="h4">Person not found</Typography>;
  }

  return (
    <>
      <Typography variant="h4" mb={2}>
        Manage {person.name}
      </Typography>
      <Box mb={2}>
        <UpdatePositionForm personID={params.personId} />
      </Box>
      <Box mb={2}>
        <UpdateEmailForm personID={params.personId} />
      </Box>
      <Box mb={2}>
        <RemovePersonForm personID={params.personId} />
      </Box>
    </>
  );
}
