import TopBar from "@/components/TopBar";
import OptimisticPersons from "@/components/OptimisticPersons";
import { getPersons } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManagePersonsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManagePersons =
    permissions["person:create"] ||
    permissions["person:delete"] ||
    permissions["person:update_position"] ||
    permissions["person:update_email"];
  if (!canManagePersons) redirect("/");

  const persons = await getPersons();
  const t = await getTranslations("persons");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticPersons persons={persons} canCreate={permissions["person:create"]} />
    </>
  );
}
