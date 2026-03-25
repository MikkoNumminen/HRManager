import TopBar from "@/components/TopBar";
import OptimisticDepartments from "@/components/OptimisticDepartments";
import { getPagedDepartments } from "@/features/departments/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ManageDepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const canManageDepartments =
    permissions["department:create"] ||
    permissions["department:delete"] ||
    permissions["department:update"] ||
    permissions["department:assign_team"];
  if (!canManageDepartments) redirect("/");

  const { page: pageParam = "1", q = "" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const { items: departments, total } = await getPagedDepartments({ page, search: q });
  const t = await getTranslations("departments");

  return (
    <>
      <TopBar title={t("manageTitle")} backHref="/" permissions={permissions} />
      <OptimisticDepartments
        departments={departments}
        total={total}
        page={page}
        search={q}
        canCreate={!!permissions["department:create"]}
      />
    </>
  );
}
