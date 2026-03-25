import TopBar from "@/components/TopBar";
import OptimisticPersons from "@/components/OptimisticPersons";
import { getPagedPersons } from "@/features/persons/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManagePersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManagePersons =
    permissions["person:create"] ||
    permissions["person:delete"] ||
    permissions["person:update_position"] ||
    permissions["person:update_email"];
  if (!canManagePersons) redirect("/");

  const { page: pageParam = "1", q = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const { items: persons, total } = await getPagedPersons({ page, search: q });
  const t = await getTranslations("persons");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticPersons
        persons={persons}
        total={total}
        page={page}
        search={q}
        canCreate={permissions["person:create"]}
      />
    </>
  );
}
