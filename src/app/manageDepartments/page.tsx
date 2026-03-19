import { Box, Typography } from "@mui/material";
import AddDepartmentForm from "@/components/AddDepartment";
import EditableDepartmentsTable from "@/components/EditableDepartmentsTable";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
import { getDepartments } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";

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

  return (
    <>
      <TopBar title="Manage Departments" backHref="/" permissions={permissions} />
      {permissions["department:create"] && <AddDepartmentForm />}
      <Box sx={{ border: `1px solid ${colors.slate300}`, borderRadius: "4px", padding: "20px" }}>
        <Typography variant="h5" mb={1}>
          Departments
        </Typography>
        <EditableDepartmentsTable departments={departments} />
      </Box>
    </>
  );
}
