import TopBar from "@/components/TopBar";
import UserPermissionEditor from "@/components/UserPermissionEditor";
import { Typography } from "@mui/material";
import { getUserById, getAllPermissionKeys } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions, ROLE_DEFAULTS } from "@/permissions";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function UserPermissionPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["admin:manage_users"]) redirect("/");

  const { userId } = await params;

  if (!UUID_REGEX.test(userId)) {
    return <Typography variant="h4">User not found</Typography>;
  }

  const user = await getUserById(userId);
  if (!user) {
    return <Typography variant="h4">User not found</Typography>;
  }

  const allPermissionKeys = await getAllPermissionKeys();
  const canAssignPermissions = permissions["admin:assign_permissions"];

  return (
    <>
      <TopBar title={`Manage ${user.name ?? user.email}`} backHref="/admin" />
      <UserPermissionEditor
        user={user}
        allPermissionKeys={allPermissionKeys}
        roleDefaults={ROLE_DEFAULTS}
        canAssignPermissions={canAssignPermissions}
      />
    </>
  );
}
