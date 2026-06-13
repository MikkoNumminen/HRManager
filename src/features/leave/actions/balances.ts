"use server";
// Leave balance allocation: set a person's allocated days for a leave type and year.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const allocateLeaveBalance: (data: FormData) => Promise<ActionResult> = guardedAction(
  "leave:manage_types",
  "allocateLeaveBalance",
  async (t, data: FormData) => {
    const personId = data.get("personId")?.valueOf();
    if (typeof personId !== "string")
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    validateUUID(personId, "personId");

    const leaveTypeId = data.get("leaveTypeId")?.valueOf();
    if (typeof leaveTypeId !== "string")
      throw new ActionError("leaveTypeRequired", t("leaveTypeRequired"));
    validateUUID(leaveTypeId, "leaveTypeId");

    const yearStr = data.get("year")?.valueOf();
    const year = typeof yearStr === "string" ? parseInt(yearStr, 10) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100)
      throw new ActionError("invalidYear", t("invalidYear"));

    const allocatedStr = data.get("allocated")?.valueOf();
    const allocated = typeof allocatedStr === "string" ? parseInt(allocatedStr, 10) : 0;
    if (isNaN(allocated) || allocated < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const person = await tx.person.findFirst({
        where: { id: personId, deletedAt: null, sessionId },
      });
      if (!person) throw new ActionError("personNotFound", t("personNotFound"));

      const leaveType = await tx.leaveType.findFirst({
        where: { id: leaveTypeId, deletedAt: null, sessionId },
      });
      if (!leaveType) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      const balance = await tx.leaveBalance.upsert({
        where: { personId_leaveTypeId_year: { personId, leaveTypeId, year } },
        create: { personId, leaveTypeId, year, allocated, sessionId },
        update: { allocated },
      });

      addAudit({
        action: "update",
        entityType: "leaveBalance",
        entityId: balance.id,
        after: {
          personName: person.name,
          leaveType: leaveType.name,
          year,
          allocated,
        },
      });
    });
    revalidatePath("/leave");
  },
);
