"use server";
// User administration: role changes, permission overrides, and session kickout.
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { DEMO_EMAIL } from "@/constants";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { requireAdminIp } from "@/lib/ipAllowlist";

export async function updateUserRole(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:manage_users");
    await rateLimit("updateUserRole");

    const userId = data.get("userId")?.toString();
    const newRole = data.get("role")?.toString();

    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    if (!newRole) throw new ActionError("noRoleProvided", t("noRoleProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const validRoles = demoSessionId
      ? ["superuser", "administrator", "user", "guest"]
      : ["administrator", "user", "guest"];
    if (!validRoles.includes(newRole)) {
      throw new ActionError("invalidRole", t("invalidRole"));
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new ActionError("cannotChangeSuperuserRole", t("cannotChangeSuperuserRole"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole, permissionsVersion: { increment: 1 } },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: userId,
        before: { role: targetUser.role, targetEmail: targetUser.email },
        after: { role: newRole, targetEmail: targetUser.email },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function updateUserPermission(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:assign_permissions");
    await rateLimit("updateUserPermission");

    const userId = data.get("userId")?.toString();
    const permissionKey = data.get("permissionKey")?.toString();
    const action = data.get("action")?.toString();

    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    if (!permissionKey) throw new ActionError("noPermissionProvided", t("noPermissionProvided"));
    if (!action) throw new ActionError("noActionProvided", t("noActionProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new ActionError(
        "cannotModifySuperuserPermissions",
        t("cannotModifySuperuserPermissions"),
      );
    }

    const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
    if (!permission) throw new ActionError("permissionNotFound", t("permissionNotFound"));

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      if (action === "reset") {
        await tx.userPermission.deleteMany({
          where: { userId, permissionId: permission.id },
        });
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "userPermission",
          entityId: userId,
          before: { permissionKey, action: "reset", targetEmail: targetUser.email },
        });
      } else {
        const granted = action === "grant";
        await tx.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: permission.id,
            },
          },
          update: { granted },
          create: { userId, permissionId: permission.id, granted },
        });
        auditEntries.push({
          ...ctx,
          action: "update",
          entityType: "userPermission",
          entityId: userId,
          after: { permissionKey, granted, targetEmail: targetUser.email },
        });
      }
      // Bump version so JWT callback detects the change
      await tx.user.update({
        where: { id: userId },
        data: { permissionsVersion: { increment: 1 } },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function kickOutUser(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:manage_users");
    await rateLimit("kickOutUser");

    const userId = data.get("userId")?.toString();
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(userId, "userId");

    const session = await auth();
    const demoSessionId = await getDemoSessionId();

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (targetUser.role === "superuser") {
      throw new ActionError("cannotKickSuperuser", t("cannotKickSuperuser"));
    }
    // Demo sessions can only kick the demo user — prevent deleting real OAuth users
    if (demoSessionId && targetUser.email !== DEMO_EMAIL) {
      throw new ActionError("demoCannotManageUsers", t("demoCannotManageUsers"));
    }
    // Prevent self-kick — deleting your own user orphans the session
    if (session?.user?.id === userId) {
      throw new ActionError("cannotKickYourself", t("cannotKickYourself"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      auditEntries.push({
        ...ctx,
        action: "kickout",
        entityType: "user",
        entityId: userId,
        before: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}
