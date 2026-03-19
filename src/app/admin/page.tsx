import { Box, Typography } from "@mui/material";
import TopBar from "@/components/TopBar";
import UserManagementTable from "@/components/UserManagementTable";
import { colors } from "@/muiStyles";
import { getUsers } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions, seedPermissions } from "@/permissions";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_users"]) redirect("/");

  await seedPermissions();

  const users = await getUsers();

  return (
    <>
      <TopBar title="User Management" backHref="/" permissions={permissions} />
      <Box
        sx={{
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          padding: "20px",
        }}
      >
        <Typography variant="h5" mb={1}>
          Users
        </Typography>
        <UserManagementTable users={users} />
      </Box>
    </>
  );
}
