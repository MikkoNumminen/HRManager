import RemovePersonForm from "@/components/RemovePerson";
import UpdateEmailForm from "@/components/UpdateEmail";
import UpdatePositionForm from "@/components/UpdatePosition";
import TopBar from "@/components/TopBar";
import { getPersons } from "@/queries";
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

  const persons = await getPersons();
  const person = persons.find((p) => p.id === personId);

  if (!person) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  return (
    <>
      <TopBar
        title={t("manageHeading", { name: person.name })}
        backHref="/managePersons"
        permissions={permissions}
      />
      {permissions["person:delete"] && <RemovePersonForm personID={personId} />}
      {permissions["person:update_position"] && (
        <UpdatePositionForm personID={personId} currentPosition={person.position || undefined} />
      )}
      {permissions["person:update_email"] && (
        <UpdateEmailForm personID={personId} currentEmail={person.email || undefined} />
      )}
    </>
  );
}
