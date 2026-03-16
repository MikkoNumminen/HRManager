import RemovePersonForm from "@/components/RemovePerson";
import UpdateEmailForm from "@/components/UpdateEmail";
import UpdatePositionForm from "@/components/UpdatePosition";
import { getPersons } from "@/serverActions";
import { Box, Typography } from "@mui/material";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({
  params,
}: {
  params: { personId: string };
}) {
  if (!UUID_REGEX.test(params.personId)) {
    return <Typography variant="h4">Person not found</Typography>;
  }

  const persons = await getPersons();
  const person = persons.find((p) => p.id === params.personId);

  if (!person) {
    return <Typography variant="h4">Person not found</Typography>;
  }

  return (
    <>
      <Typography variant="h4" mb={2}>Manage {person.name}</Typography>
      <Box mb={2}>
        <RemovePersonForm personID={params.personId} />
      </Box>
      <Box mb={2}>
        <UpdatePositionForm personID={params.personId} showCancel={false} />
      </Box>
      <Box mb={2}>
        <UpdateEmailForm personID={params.personId} showCancel={false} />
      </Box>
    </>
  );
}
