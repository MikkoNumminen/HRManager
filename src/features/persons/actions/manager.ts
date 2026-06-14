"use server";
// Assign a person as the manager of one or more teams, restoring membership as needed.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const addManager: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:update_manager",
  "addManager",
  async (t, data: FormData) => {
    const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
    const personID = data.get("personID")?.toString();

    if (teamIDs.length === 0) {
      throw new ActionError("noTeamSelected", t("noTeamSelected"));
    }
    if (!personID) {
      throw new ActionError("noPersonProvided", t("noPersonProvided"));
    }
    teamIDs.forEach((id) => validateUUID(id, "teamID"));
    validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const person = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!person) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }

      for (const teamID of teamIDs) {
        const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
        if (!teamBefore) {
          throw new ActionError("teamNotFound", t("teamNotFound"));
        }
        await tx.team.updateMany({
          where: { teamId: teamID, sessionId },
          data: { teamManagerId: personID },
        });
        addAudit({
          action: "update",
          entityType: "team",
          entityId: teamID,
          before: { teamManagerId: teamBefore?.teamManagerId },
          after: { teamManagerId: personID },
        });

        const existingMember = await tx.teamMember.findFirst({
          where: { personId: personID, teamId: teamID, sessionId },
        });

        if (!existingMember) {
          const member = await tx.teamMember.create({
            data: {
              personId: personID,
              teamId: teamID,
              sessionId,
            },
          });
          addAudit({
            action: "create",
            entityType: "teamMember",
            entityId: member.id,
            after: { personId: personID, teamId: teamID },
          });
        } else if (existingMember.deletedAt) {
          // Restore soft-deleted membership
          await tx.teamMember.update({
            where: { id: existingMember.id },
            data: { deletedAt: null },
          });
          addAudit({
            action: "create",
            entityType: "teamMember",
            entityId: existingMember.id,
            after: { personId: personID, teamId: teamID },
          });
        }
      }
    });
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageTeams");
  },
);
