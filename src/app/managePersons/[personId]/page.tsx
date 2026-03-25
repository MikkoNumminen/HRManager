import RemovePersonForm from "@/components/RemovePerson";
import UpdatePersonNameForm from "@/components/UpdatePersonName";
import UpdateEmailForm from "@/components/UpdateEmail";
import UpdatePositionForm from "@/components/UpdatePosition";
import TopBar from "@/components/TopBar";
import { getPersons, getPersonDeleteImpact } from "@/features/persons/queries";
import { getPositions } from "@/features/positions/queries";
import { Typography } from "@mui/material";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({ params }: { params: Promise<{ personId: string }> }) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const t = await getTranslations("persons");
  const { personId } = await params;

  if (!UUID_REGEX.test(personId)) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const [persons, positions] = await Promise.all([getPersons(), getPositions()]);
  const person = persons.find((p) => p.id === personId);

  if (!person) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const impact = permissions["person:delete"] ? await getPersonDeleteImpact(personId) : undefined;

  return (
    <>
      <TopBar
        title={t("manageHeading", { name: person.name })}
        backHref="/managePersons"
        permissions={permissions}
      />
      {permissions["person:delete"] && <RemovePersonForm personID={personId} impact={impact} />}
      {permissions["person:update_name"] && (
        <UpdatePersonNameForm personID={personId} currentName={person.name} />
      )}
      {permissions["person:update_position"] && (
        <UpdatePositionForm
          personID={personId}
          currentPosition={person.position || undefined}
          positions={positions}
        />
      )}
      {permissions["person:update_email"] && (
        <UpdateEmailForm personID={personId} currentEmail={person.email || undefined} />
      )}
    </>
  );
}
