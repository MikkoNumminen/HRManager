"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import {
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  EmailSchema,
} from "@/schemas/shared";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const createPerson: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:create",
  "createPerson",
  async (t, data: FormData) => {
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
    // Store canonically (lowercase) and de-duplicate case-insensitively, matching
    // the CSV importer — "John@x.com" and "john@x.com" must not both be created.
    const normalizedEmail = email.trim().toLowerCase();

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingPerson = await tx.person.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: "insensitive" },
          deletedAt: null,
          sessionId,
        },
      });
      if (existingPerson) {
        throw new ActionError("emailAlreadyExists", t("emailAlreadyExists"));
      }

      const person = await tx.person.create({
        data: {
          name: name.trim(),
          position: null,
          email: normalizedEmail,
          sessionId,
        },
      });
      addAudit({
        action: "create",
        entityType: "person",
        entityId: person.id,
        after: { name: person.name, email: person.email },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

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

export const updatePersonName: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_name",
  "updatePersonName",
  async (t, data: FormData) => {
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
    await withAuditedTransaction(async (tx, addAudit) => {
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
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { name: personBefore.name },
        after: { name: newName },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updatePosition: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_position",
  "updatePosition",
  async (t, data: FormData) => {
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
    await withAuditedTransaction(async (tx, addAudit) => {
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
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { position: personBefore.position },
        after: { position: newPosition },
      });
    });
    revalidatePath("/managePersons");
    revalidatePath("/positions");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updateEmail: (data: FormData) => Promise<ActionResult> = guardedAction(
  "person:update_email",
  "updateEmail",
  async (t, data: FormData) => {
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    validateUUID(personID, "personID");

    const newEmail = (data.get("email") ?? data.get("name"))?.toString().trim().toLowerCase();
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
    await withAuditedTransaction(async (tx, addAudit) => {
      const existingPerson = await tx.person.findFirst({
        where: {
          email: { equals: newEmail, mode: "insensitive" },
          deletedAt: null,
          sessionId,
        },
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
      addAudit({
        action: "update",
        entityType: "person",
        entityId: personID,
        before: { email: personBefore.email },
        after: { email: newEmail },
      });
    });
    revalidatePath("/managePersons");
  },
);

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
