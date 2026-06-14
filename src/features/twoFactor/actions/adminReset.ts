"use server";
// Admin-initiated 2FA reset for another user (admin:manage_users).
import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { revalidatePath } from "next/cache";

/** Admin action: reset a user's 2FA. Requires admin:manage_users permission. */
export const adminResetTwoFactor: (data: FormData) => Promise<ActionResult> = guardedAction(
  "admin:manage_users",
  "adminResetTwoFactor",
  async (t, data: FormData) => {
    const userId = data.get("userId")?.toString();
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(userId, "userId");

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));

    const tfa = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tfa) {
      // No 2FA to reset
      return;
    }

    await withAuditedTransaction(async (tx, addAudit) => {
      await tx.twoFactorAuth.delete({
        where: { userId },
      });

      addAudit({
        action: "update",
        entityType: "user",
        entityId: userId,
        after: {
          twoFactorAdminReset: true,
          targetEmail: targetUser.email,
        },
      });
    });

    revalidatePath("/admin");
  },
);
