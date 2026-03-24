"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "./_shared";

export async function addMember(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:add_member");
    await rateLimit("addMember");
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
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
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
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "teamMember",
        entityId: member.id,
        after: { personId: personID, teamId: teamID },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    redirect("..");
  });
}

export async function createTeam(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:create");
    await rateLimit("createTeam");
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          teamName: name.trim(),
          teamManagerId: null,
          sessionId,
        },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "team",
        entityId: team.teamId,
        after: { teamName: team.teamName },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    revalidatePath("/");
  });
}

export async function updateTeamName(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:update_name");
    await rateLimit("updateTeamName");
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
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new ActionError("teamNotFound", t("teamNotFound"));
      }
      await tx.team.updateMany({
        where: { teamId: teamID, sessionId },
        data: { teamName: newName },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { teamName: teamBefore.teamName },
        after: { teamName: newName },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    revalidatePath("/");
  });
}

export async function removeTeam(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:delete");
    await rateLimit("removeTeam");
    const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
    if (teamIDs.length === 0) {
      throw new ActionError("noTeamSelected", t("noTeamSelected"));
    }
    teamIDs.forEach((id) => validateUUID(id, "teamID"));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
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
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "team",
          entityId: team.teamId,
          before: { teamName: team.teamName, teamManagerId: team.teamManagerId },
        });
      }
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    revalidatePath("/");
    redirect("/manageTeams");
  });
}

export async function removeMember(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:remove_member");
    await rateLimit("removeMember");
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
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
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
      auditEntries.push({
        ...ctx,
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
        auditEntries.push({
          ...ctx,
          action: "update",
          entityType: "team",
          entityId: teamID,
          before: { teamManagerId: personID },
          after: { teamManagerId: null },
        });
      }
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    redirect("..");
  });
}
