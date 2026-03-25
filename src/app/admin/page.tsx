import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import UserManagementTable from "@/components/UserManagementTable";
import { pageContainerStyles } from "@/muiStyles";
import { getUsers } from "@/features/admin/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions, seedPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_users"]) redirect("/");

  await seedPermissions();

  const users = await getUsers();
  const t = await getTranslations("admin");

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <Box data-tutorial="users-table" sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <UserManagementTable users={users} />
      </Box>
    </>
  );
}
