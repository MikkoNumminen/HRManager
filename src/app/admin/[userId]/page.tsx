import TopBar from "@/components/TopBar";
import UserPermissionEditor from "@/components/UserPermissionEditor";
import { Typography } from "@mui/material";
import { getUserById, getAllPermissionKeys } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions, ROLE_DEFAULTS } from "@/permissions";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations("admin");
  const { userId } = await params;

  if (!UUID_REGEX.test(userId)) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const user = await getUserById(userId);
  if (!user) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const allPermissionKeys = await getAllPermissionKeys();
  const canAssignPermissions = permissions["admin:assign_permissions"];

  return (
    <>
      <TopBar
        title={t("manageHeading", { name: user.name ?? user.email })}
        backHref="/admin"
        permissions={permissions}
      />
      <UserPermissionEditor
        user={user}
        allPermissionKeys={allPermissionKeys}
        roleDefaults={ROLE_DEFAULTS}
        canAssignPermissions={canAssignPermissions}
      />
    </>
  );
}
