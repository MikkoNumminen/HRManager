import { Box, Typography } from "@mui/material";
import AddDepartmentForm from "@/components/AddDepartment";
import EditableDepartmentsTable from "@/components/EditableDepartmentsTable";
import TopBar from "@/components/TopBar";
import { colors } from "@/muiStyles";
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
      {permissions["department:create"] && <AddDepartmentForm />}
      <Box
        data-tutorial="departments-table"
        sx={{
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          padding: { xs: "12px", sm: "20px" },
        }}
      >
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <EditableDepartmentsTable departments={departments} />
      </Box>
    </>
  );
}
