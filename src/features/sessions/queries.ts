import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { auth } from "@/auth";
import { hasPermission } from "@/permissions";
import { UserSessionSchema, UserSession } from "./schemas";

/**
 * Get all active sessions for the currently logged-in user.
 * Used on the profile page to show "Your Active Sessions".
 */
export async function getMyActiveSessions(): Promise<UserSession[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const sessions = await prisma.userSession.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { lastActiveAt: "desc" },
  });

  return sessions.map((s) => UserSessionSchema.parse(s));
}

/**
 * Get all active sessions for a specific user (admin view).
 * Requires admin:manage_users permission.
 */
export async function getUserActiveSessions(userId: string): Promise<UserSession[]> {
  const allowed = await hasPermission("admin:manage_users");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  const sessions = await prisma.userSession.findMany({
    where: { userId, active: true },
    orderBy: { lastActiveAt: "desc" },
  });

  return sessions.map((s) => UserSessionSchema.parse(s));
}
