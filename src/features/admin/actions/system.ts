"use server";
// System & danger-zone actions: full data reset and permission catalog init.
import { revalidatePath } from "next/cache";
import { requirePermission, seedPermissions } from "@/permissions";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";
import { requireAdminIp } from "@/lib/ipAllowlist";

export const resetAll: () => Promise<ActionResult> = guardedAction(
  "data:reset",
  "resetAll",
  async (t) => {
    const sessionId = await getDemoSessionId();
    if (!sessionId) {
      // resetAll deletes every row matching `where: { sessionId }`. For a non-demo
      // caller getDemoSessionId() is null, which would hard-delete every org-wide
      // row (sessionId IS NULL) while the audit log captures only row counts —
      // unrecoverable. This destructive reset is the demo sandbox's "start fresh"
      // action, so refuse it outside a demo session.
      throw new ActionError("resetRequiresDemoSession", t("resetRequiresDemoSession"));
    }
    await withAuditedTransaction(async (tx, addAudit) => {
      const sessionWhere = { sessionId };
      const counts = {
        teamMembers: await tx.teamMember.count({ where: sessionWhere }),
        teams: await tx.team.count({ where: sessionWhere }),
        departments: await tx.department.count({ where: sessionWhere }),
        persons: await tx.person.count({ where: sessionWhere }),
      };
      await tx.leaveRequest.deleteMany({ where: sessionWhere });
      await tx.leaveBalance.deleteMany({ where: sessionWhere });
      await tx.leaveType.deleteMany({ where: sessionWhere });
      await tx.teamMember.deleteMany({ where: sessionWhere });
      await tx.team.deleteMany({ where: sessionWhere });
      await tx.department.deleteMany({ where: sessionWhere });
      await tx.person.deleteMany({ where: sessionWhere });
      addAudit({
        action: "reset",
        entityType: "person",
        before: counts,
      });
    });
    revalidatePath("/");
    invalidateDashboardCache();
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/leave");
  },
);

export async function initializePermissions() {
  await requireAdminIp();
  await requirePermission("admin:manage_users");
  await rateLimit("initializePermissions");
  await seedPermissions();
}
