import RemovePersonForm from "@/components/RemovePerson";
import UpdateEmailForm from "@/components/UpdateEmail";
import UpdatePositionForm from "@/components/UpdatePosition";
import TopBar from "@/components/TopBar";
import { getPersons } from "@/queries";
import { Typography } from "@mui/material";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;

  if (!UUID_REGEX.test(personId)) {
    return <Typography variant="h4">Person not found</Typography>;
  }

  const persons = await getPersons();
  const person = persons.find((p) => p.id === personId);

  if (!person) {
    return <Typography variant="h4">Person not found</Typography>;
  }

  return (
    <>
      <TopBar title={`Manage ${person.name}`} backHref="/managePersons" />
      <RemovePersonForm personID={personId} />
      <UpdatePositionForm personID={personId} currentPosition={person.position || undefined} />
      <UpdateEmailForm personID={personId} currentEmail={person.email || undefined} />
    </>
  );
}
