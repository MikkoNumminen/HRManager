"use server";
// Soft-delete persons, cascading membership removal and nulling manager/head FKs.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const removePerson: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:delete",
  "removePerson",
  async (t, data: FormData) => {
    const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
    if (personIDs.length === 0) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    personIDs.forEach((id) => validateUUID(id, "personID"));

    const sessionId = await getDemoSessionId();
    const now = new Date();
    await withAuditedTransaction(async (tx, addAudit) => {
      const personsToDelete = await tx.person.findMany({
        where: { id: { in: personIDs }, deletedAt: null, sessionId },
      });

      // Cascade soft-delete: mark TeamMember rows as deleted
      await tx.teamMember.updateMany({
        where: { personId: { in: personIDs }, deletedAt: null, sessionId },
        data: { deletedAt: now },
      });

      // Null FK refs: teams managed by these persons
      await tx.team.updateMany({
        where: { teamManagerId: { in: personIDs }, sessionId },
        data: { teamManagerId: null },
      });

      // Null FK refs: departments headed by these persons
      await tx.department.updateMany({
        where: { headId: { in: personIDs }, sessionId },
        data: { headId: null },
      });

      // Soft-delete the persons
      await tx.person.updateMany({
        where: { id: { in: personIDs }, sessionId },
        data: { deletedAt: now },
      });

      for (const person of personsToDelete) {
        addAudit({
          action: "delete",
          entityType: "person",
          entityId: person.id,
          before: { name: person.name, email: person.email, position: person.position },
        });
      }
    });
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);
