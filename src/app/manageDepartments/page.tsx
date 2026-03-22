import TopBar from "@/components/TopBar";
import OptimisticDepartments from "@/components/OptimisticDepartments";
import { getDepartments } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManageDepartmentsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManageDepartments =
    permissions["department:create"] ||
    permissions["department:delete"] ||
    permissions["department:update"] ||
    permissions["department:assign_team"];
  if (!canManageDepartments) redirect("/");

  const departments = await getDepartments();
  const t = await getTranslations("departments");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticDepartments
        departments={departments}
        canCreate={permissions["department:create"]}
      />
    </>
  );
}
