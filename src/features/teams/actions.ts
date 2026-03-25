"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH } from "@/schemas";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const addMember: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:add_member",
  "addMember",
  async (t, data: FormData) => {
    const teamID = data.get("teamID")?.toString();
    const personID = data.get("personID")?.toString();

    if (!teamID) {
      throw new ActionError("noTeamSelected", t("noTeamSelected"));
    }
    if (!personID) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    validateUUID(teamID, "teamID");
    validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingMember = await tx.teamMember.findFirst({
        where: { personId: personID, teamId: teamID, sessionId },
      });

      if (existingMember && !existingMember.deletedAt) {
        throw new ActionError("alreadyMember", t("alreadyMember"));
      }

      let member;
      if (existingMember?.deletedAt) {
        // Restore soft-deleted membership
        member = await tx.teamMember.update({
          where: { id: existingMember.id },
          data: { deletedAt: null },
        });
      } else {
        member = await tx.teamMember.create({
          data: {
            personId: personID,
            teamId: teamID,
            sessionId,
          },
        });
      }
      addAudit({
        action: "create",
        entityType: "teamMember",
        entityId: member.id,
        after: { personId: personID, teamId: teamID },
      });
    });
    revalidatePath("/manageTeams");
    redirect("..");
  },
);

export const createTeam: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:create",
  "createTeam",
  async (t, data: FormData) => {
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const team = await tx.team.create({
        data: {
          teamName: name.trim(),
          teamManagerId: null,
          sessionId,
        },
      });
      addAudit({
        action: "create",
        entityType: "team",
        entityId: team.teamId,
        after: { teamName: team.teamName },
      });
    });
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updateTeamName: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:update_name",
  "updateTeamName",
  async (t, data: FormData) => {
    const teamID = data.get("teamID")?.toString();
    if (!teamID) {
      throw new ActionError("noTeamProvided", t("noTeamProvided"));
    }
    validateUUID(teamID, "teamID");

    const newName = data.get("name")?.toString().trim();
    if (!newName) {
      throw new ActionError("teamNameRequired", t("teamNameRequired"));
    }
    if (newName.length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new ActionError("teamNotFound", t("teamNotFound"));
      }
      await tx.team.updateMany({
        where: { teamId: teamID, sessionId },
        data: { teamName: newName },
      });
      addAudit({
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { teamName: teamBefore.teamName },
        after: { teamName: newName },
      });
    });
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const removeTeam: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:delete",
  "removeTeam",
  async (t, data: FormData) => {
    const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
    if (teamIDs.length === 0) {
      throw new ActionError("noTeamSelected", t("noTeamSelected"));
    }
    teamIDs.forEach((id) => validateUUID(id, "teamID"));

    const sessionId = await getDemoSessionId();
    const now = new Date();
    await withAuditedTransaction(async (tx, addAudit) => {
      const teamsToDelete = await tx.team.findMany({
        where: { teamId: { in: teamIDs }, deletedAt: null, sessionId },
      });

      // Cascade soft-delete: mark TeamMember rows as deleted
      await tx.teamMember.updateMany({
        where: { teamId: { in: teamIDs }, deletedAt: null, sessionId },
        data: { deletedAt: now },
      });

      // Soft-delete the teams
      await tx.team.updateMany({
        where: { teamId: { in: teamIDs }, sessionId },
        data: { deletedAt: now },
      });

      for (const team of teamsToDelete) {
        addAudit({
          action: "delete",
          entityType: "team",
          entityId: team.teamId,
          before: { teamName: team.teamName, teamManagerId: team.teamManagerId },
        });
      }
    });
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageTeams");
  },
);

export const removeMember: (data: FormData) => Promise<ActionResult> = guardedAction(
  "team:remove_member",
  "removeMember",
  async (t, data: FormData) => {
    const teamID = data.get("teamID")?.toString();
    const personID = data.get("personID")?.toString();

    if (!teamID) {
      throw new ActionError("noTeamSelected", t("noTeamSelected"));
    }
    if (!personID) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    validateUUID(teamID, "teamID");
    validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingMember = await tx.teamMember.findFirst({
        where: {
          personId: personID,
          teamId: teamID,
          deletedAt: null,
          sessionId,
        },
      });

      if (!existingMember) {
        throw new ActionError("notMember", t("notMember"));
      }

      await tx.teamMember.update({
        where: { id: existingMember.id },
        data: { deletedAt: new Date() },
      });
      addAudit({
        action: "delete",
        entityType: "teamMember",
        entityId: existingMember.id,
        before: { personId: personID, teamId: teamID },
      });

      const team = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (team?.teamManagerId === personID) {
        await tx.team.updateMany({
          where: { teamId: teamID, sessionId },
          data: { teamManagerId: null },
        });
        addAudit({
          action: "update",
          entityType: "team",
          entityId: teamID,
          before: { teamManagerId: personID },
          after: { teamManagerId: null },
        });
      }
    });
    revalidatePath("/manageTeams");
    redirect("..");
  },
);
