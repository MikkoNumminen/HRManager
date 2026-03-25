"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, MAX_EMAIL_LENGTH, MAX_POSITION_LENGTH, EmailSchema } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export async function createPerson(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:create");
    await rateLimit("createPerson");
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const email = data.get("email")?.valueOf();
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new ActionError("emailRequired", t("emailRequired"));
    }
    if (email.trim().length > MAX_EMAIL_LENGTH) {
      throw new ActionError("emailTooLong", t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(email).success) {
      throw new ActionError("invalidEmailFormat", t("invalidEmailFormat"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existingPerson = await tx.person.findFirst({
        where: { email, deletedAt: null, sessionId },
      });
      if (existingPerson) {
        throw new ActionError("emailAlreadyExists", t("emailAlreadyExists"));
      }

      const person = await tx.person.create({
        data: {
          name: name.trim(),
          position: null,
          email: email.trim(),
          sessionId,
        },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "person",
        entityId: person.id,
        after: { name: person.name, email: person.email },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  });
}

export async function removePerson(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:delete");
    await rateLimit("removePerson");
    const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
    if (personIDs.length === 0) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    personIDs.forEach((id) => validateUUID(id, "personID"));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
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
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "person",
          entityId: person.id,
          before: { name: person.name, email: person.email, position: person.position },
        });
      }
    });
    deferAudit(auditEntries);
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    invalidateDashboardCache();
  });
}

export async function updatePersonName(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_name");
    await rateLimit("updatePersonName");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonProvided", t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newName = data.get("name")?.toString().trim();
    if (!newName) {
      throw new ActionError("newNameRequired", t("newNameRequired"));
    }
    if (newName.length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { name: newName },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { name: personBefore.name },
        after: { name: newName },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  });
}

export async function updatePosition(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_position");
    await rateLimit("updatePosition");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonProvided", t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newPosition = (data.get("position") ?? data.get("name"))?.toString().trim();
    if (!newPosition) {
      throw new ActionError("positionRequired", t("positionRequired"));
    }
    if (newPosition.length > MAX_POSITION_LENGTH) {
      throw new ActionError("positionTooLong", t("positionTooLong", { max: MAX_POSITION_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { position: newPosition },
      });
      // Sync position name into the catalog
      const existingPos = await tx.position.findFirst({
        where: { name: newPosition, sessionId, deletedAt: null },
      });
      if (!existingPos) {
        await tx.position.create({ data: { name: newPosition, sessionId } });
      }
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { position: personBefore.position },
        after: { position: newPosition },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/managePersons");
    revalidatePath("/positions");
    revalidatePath("/");
    invalidateDashboardCache();
  });
}

export async function updateEmail(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_email");
    await rateLimit("updateEmail");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    validateUUID(personID, "personID");

    const newEmail = (data.get("email") ?? data.get("name"))?.toString().trim();
    if (!newEmail) {
      throw new ActionError("newEmailRequired", t("newEmailRequired"));
    }
    if (newEmail.length > MAX_EMAIL_LENGTH) {
      throw new ActionError("emailTooLong", t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(newEmail).success) {
      throw new ActionError("invalidEmailFormat", t("invalidEmailFormat"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existingPerson = await tx.person.findFirst({
        where: { email: newEmail, deletedAt: null, sessionId },
      });
      if (existingPerson && existingPerson.id !== personID) {
        throw new ActionError("emailAlreadyExists", t("emailAlreadyExists"));
      }

      const personBefore = await tx.person.findFirst({
        where: { id: personID, deletedAt: null, sessionId },
      });
      if (!personBefore) {
        throw new ActionError("personNotFound", t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, deletedAt: null, sessionId },
        data: { email: newEmail },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { email: personBefore.email },
        after: { email: newEmail },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/managePersons");
  });
}

export async function addManager(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:update_manager");
    await rateLimit("addManager");
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
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
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
        auditEntries.push({
          ...ctx,
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
          auditEntries.push({
            ...ctx,
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
          auditEntries.push({
            ...ctx,
            action: "create",
            entityType: "teamMember",
            entityId: existingMember.id,
            after: { personId: personID, teamId: teamID },
          });
        }
      }
    });
    deferAudit(auditEntries);
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageTeams");
  });
}
