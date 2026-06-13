"use server";
// Mutation style: this file uses the INLINE pattern — auth/rate-limit +
// audit (captureAuditContext/deferAudit) handled directly, NOT the
// guardedAction/withAuditedTransaction wrappers. See AGENTS.md → "two
// sanctioned mutation patterns". Match this pattern when editing; new
// domain features should use the wrappers.
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";

/**
 * Sign out all other sessions for the current user.
 * Keeps the current session (identified by sessionId in JWT) active,
 * deactivates all others.
 */
export async function signOutOtherSessions(): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("signOutOtherSessions");

    const currentSessionId = (session as unknown as { sessionId?: string }).sessionId;

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const deactivated = await tx.userSession.updateMany({
        where: {
          userId: session.user.id!,
          active: true,
          ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}),
        },
        data: { active: false },
      });
      auditEntries.push({
        ...ctx,
        action: "session_force_logout",
        entityType: "userSession",
        entityId: session.user.id!,
        after: { deactivatedCount: deactivated.count, reason: "sign_out_other_sessions" },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/profile");
  });
}

/**
 * Admin: force-logout a specific session by sessionId.
 */
export async function adminForceLogoutSession(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_users");
    await rateLimit("adminForceLogoutSession");

    const sessionId = data.get("sessionId")?.toString();
    if (!sessionId) throw new ActionError("sessionNotFound", t("sessionNotFound"));
    validateUUID(sessionId, "sessionId");

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const userSession = await tx.userSession.findUnique({ where: { id: sessionId } });
      if (!userSession) throw new ActionError("sessionNotFound", t("sessionNotFound"));
      if (!userSession.active)
        throw new ActionError("sessionAlreadyInactive", t("sessionAlreadyInactive"));

      await tx.userSession.update({
        where: { id: sessionId },
        data: { active: false },
      });
      auditEntries.push({
        ...ctx,
        action: "session_force_logout",
        entityType: "userSession",
        entityId: sessionId,
        after: {
          userId: userSession.userId,
          reason: "admin_force_logout",
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

/**
 * Admin: force-logout ALL sessions for a user.
 */
export async function adminForceLogoutAllSessions(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_users");
    await rateLimit("adminForceLogoutAllSessions");

    const userId = data.get("userId")?.toString();
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(userId, "userId");

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new ActionError("userNotFound", t("userNotFound"));

      const deactivated = await tx.userSession.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      auditEntries.push({
        ...ctx,
        action: "session_force_logout",
        entityType: "userSession",
        entityId: userId,
        after: {
          deactivatedCount: deactivated.count,
          reason: "admin_force_logout_all",
          userEmail: user.email,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}
