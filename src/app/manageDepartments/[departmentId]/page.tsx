import UpdateDepartmentForm from "@/components/UpdateDepartment";
import UpdateDepartmentHeadForm from "@/components/UpdateDepartmentHead";
import RemoveDepartmentForm from "@/components/RemoveDepartment";
import AssignTeamToDepartmentForm from "@/components/AssignTeamToDepartment";
import RemoveTeamFromDepartmentForm from "@/components/RemoveTeamFromDepartment";
import { getDepartments, getDepartmentDeleteImpact } from "@/features/departments/queries";
import { getPersons } from "@/features/persons/queries";
import { getTeams } from "@/features/teams/queries";
import { Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  const t = await getTranslations("departments");
  const { departmentId } = await params;

  if (!UUID_REGEX.test(departmentId)) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const [departments, persons, teams] = await Promise.all([
    getDepartments(),
    getPersons(),
    getTeams(),
  ]);
  const department = departments.find((d) => d.id === departmentId);

  if (!department) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const deptImpact = permissions["department:delete"]
    ? await getDepartmentDeleteImpact(departmentId)
    : undefined;
  const departmentTeamIds = department.teams.map((t) => t.teamId);
  const availableTeams = teams.filter(
    (t) => !t.departmentId || !departmentTeamIds.includes(t.teamId),
  );
  const currentTeams = teams.filter((t) => departmentTeamIds.includes(t.teamId));

  return (
    <>
      <TopBar
        title={t("manageHeading", { name: department.name })}
        backHref="/manageDepartments"
        permissions={permissions}
      />
      {permissions["department:delete"] && (
        <RemoveDepartmentForm departmentID={departmentId} impact={deptImpact} />
      )}
      {permissions["department:update"] && (
        <UpdateDepartmentForm
          departmentID={departmentId}
          currentName={department.name}
          currentDescription={department.description}
        />
      )}
      {permissions["department:update"] && (
        <UpdateDepartmentHeadForm
          departmentID={departmentId}
          persons={persons}
          excludeIds={department.headId ? [department.headId] : []}
        />
      )}
      {permissions["department:assign_team"] && availableTeams.length > 0 && (
        <AssignTeamToDepartmentForm departmentID={departmentId} availableTeams={availableTeams} />
      )}
      {permissions["department:assign_team"] && currentTeams.length > 0 && (
        <RemoveTeamFromDepartmentForm currentTeams={currentTeams} />
      )}
    </>
  );
}
