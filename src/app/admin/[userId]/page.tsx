import TopBar from "@/components/TopBar";
import UserPermissionEditor from "@/features/admin/components/UserPermissionEditor";
import AdminUserSessions from "@/features/admin/components/AdminUserSessions";
import { Typography } from "@mui/material";
import { getUserById, getAllPermissionKeys } from "@/features/admin/queries";
import { getUserActiveSessions } from "@/features/sessions/queries";
import { isUserTwoFactorEnabled } from "@/features/twoFactor/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions, ROLE_DEFAULTS } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { getDemoSessionId } from "@/demoSession";

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

  const [user, allPermissionKeys, userSessions, userHas2FA] = await Promise.all([
    getUserById(userId),
    getAllPermissionKeys(),
    getUserActiveSessions(userId),
    isUserTwoFactorEnabled(userId),
  ]);

  if (!user) {
    return <Typography variant="h4">{t("notFound")}</Typography>;
  }

  const canAssignPermissions = permissions["admin:assign_permissions"] ?? false;
  const demoSessionId = await getDemoSessionId();

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
        isDemoSession={!!demoSessionId}
        twoFactorEnabled={userHas2FA}
      />
      <AdminUserSessions sessions={userSessions} userId={userId} userName={user.name} />
    </>
  );
}
