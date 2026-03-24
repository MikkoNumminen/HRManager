"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, seedPermissions } from "@/permissions";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, deferAuditLog, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { getDemoSessionId } from "@/demoSession";
import {
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_URL_LENGTH,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_FILE_SIZE,
  EmailSchema,
  MAX_LEAVE_NOTE_LENGTH,
  type ReviewQuestion,
} from "@/schemas";
import { parseCSV, generateCSV, validatePersonImportRows } from "@/csvUtils";
import { getTranslations } from "next-intl/server";

/** Server actions return ActionResult so error messages survive Next.js production sanitization. */
export type ActionResult = { error: string } | undefined;

async function safe(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
  } catch (error) {
    // Re-throw Next.js internal errors (redirect, notFound) so they work normally
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof Error) return { error: error.message };
    const tErr = await getTranslations("errors");
    return { error: tErr("unexpectedError") };
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

export async function createPerson(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:create");
    await rateLimit("createPerson");
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error(t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const email = data.get("email")?.valueOf();
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new Error(t("emailRequired"));
    }
    if (email.trim().length > MAX_EMAIL_LENGTH) {
      throw new Error(t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(email).success) {
      throw new Error(t("invalidEmailFormat"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existingPerson = await tx.person.findFirst({
        where: { email, deletedAt: null, sessionId },
      });
      if (existingPerson) {
        throw new Error(t("emailAlreadyExists"));
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
  });
}

export async function removePerson(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:delete");
    await rateLimit("removePerson");
    const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
    if (personIDs.length === 0) {
      throw new Error(t("noPersonSelected"));
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
  });
}

export async function updatePersonName(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_name");
    await rateLimit("updatePersonName");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new Error(t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newName = data.get("name")?.toString().trim();
    if (!newName) {
      throw new Error(t("newNameRequired"));
    }
    if (newName.length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, sessionId },
      });
      if (!personBefore) {
        throw new Error(t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, sessionId },
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
  });
}

export async function updatePosition(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_position");
    await rateLimit("updatePosition");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new Error(t("noPersonProvided"));
    }
    validateUUID(personID, "personID");

    const newPosition = (data.get("position") ?? data.get("name"))?.toString().trim();
    if (!newPosition) {
      throw new Error(t("positionRequired"));
    }
    if (newPosition.length > MAX_POSITION_LENGTH) {
      throw new Error(t("positionTooLong", { max: MAX_POSITION_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const personBefore = await tx.person.findFirst({
        where: { id: personID, sessionId },
      });
      if (!personBefore) {
        throw new Error(t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, sessionId },
        data: { position: newPosition },
      });
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
    revalidatePath("/");
  });
}

export async function updateEmail(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("person:update_email");
    await rateLimit("updateEmail");
    const personID = data.get("personID")?.toString();
    if (!personID) {
      throw new Error(t("noPersonSelected"));
    }
    validateUUID(personID, "personID");

    const newEmail = (data.get("email") ?? data.get("name"))?.toString().trim();
    if (!newEmail) {
      throw new Error(t("newEmailRequired"));
    }
    if (newEmail.length > MAX_EMAIL_LENGTH) {
      throw new Error(t("emailTooLong", { max: MAX_EMAIL_LENGTH }));
    }
    if (!EmailSchema.safeParse(newEmail).success) {
      throw new Error(t("invalidEmailFormat"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existingPerson = await tx.person.findFirst({
        where: { email: newEmail, deletedAt: null, sessionId },
      });
      if (existingPerson && existingPerson.id !== personID) {
        throw new Error(t("emailAlreadyExists"));
      }

      const personBefore = await tx.person.findFirst({
        where: { id: personID, sessionId },
      });
      if (!personBefore) {
        throw new Error(t("personNotFound"));
      }
      await tx.person.updateMany({
        where: { id: personID, sessionId },
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
      throw new Error(t("noTeamSelected"));
    }
    if (!personID) {
      throw new Error(t("noPersonProvided"));
    }
    teamIDs.forEach((id) => validateUUID(id, "teamID"));
    validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.findFirst({ where: { id: personID, sessionId } });
      if (!person) {
        throw new Error(t("personNotFound"));
      }

      for (const teamID of teamIDs) {
        const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
        if (!teamBefore) {
          throw new Error(t("teamNotFound"));
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
    redirect("/manageTeams");
  });
}

export async function addMember(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("team:add_member");
    await rateLimit("addMember");
    const teamID = data.get("teamID")?.toString();
    const personID = data.get("personID")?.toString();

    if (!teamID) {
      throw new Error(t("noTeamSelected"));
    }
    if (!personID) {
      throw new Error(t("noPersonSelected"));
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
        throw new Error(t("alreadyMember"));
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
      throw new Error(t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
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
      throw new Error(t("noTeamProvided"));
    }
    validateUUID(teamID, "teamID");

    const newName = data.get("name")?.toString().trim();
    if (!newName) {
      throw new Error(t("teamNameRequired"));
    }
    if (newName.length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new Error(t("teamNotFound"));
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
      throw new Error(t("noTeamSelected"));
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
      throw new Error(t("noTeamSelected"));
    }
    if (!personID) {
      throw new Error(t("noPersonSelected"));
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
        throw new Error(t("notMember"));
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

export async function createDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:create");
    await rateLimit("createDepartment");
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error(t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const description = data.get("description")?.toString().trim() || null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          name: name.trim(),
          description,
          sessionId,
        },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "department",
        entityId: department.id,
        after: { name: department.name, description: department.description },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/");
  });
}

export async function removeDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:delete");
    await rateLimit("removeDepartment");
    const departmentIDs = data
      .getAll("departmentID")
      .filter((v): v is string => typeof v === "string");
    if (departmentIDs.length === 0) {
      throw new Error(t("noDepartmentSelected"));
    }
    departmentIDs.forEach((id) => validateUUID(id, "departmentID"));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const departmentsToDelete = await tx.department.findMany({
        where: { id: { in: departmentIDs }, deletedAt: null, sessionId },
      });

      // Null FK refs: teams assigned to these departments
      await tx.team.updateMany({
        where: { departmentId: { in: departmentIDs }, sessionId },
        data: { departmentId: null },
      });

      // Soft-delete the departments
      await tx.department.updateMany({
        where: { id: { in: departmentIDs }, sessionId },
        data: { deletedAt: now },
      });

      for (const dept of departmentsToDelete) {
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "department",
          entityId: dept.id,
          before: { name: dept.name, description: dept.description },
        });
      }
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    redirect("/manageDepartments");
  });
}

export async function updateDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:update");
    await rateLimit("updateDepartment");
    const departmentID = data.get("departmentID")?.toString();
    if (!departmentID) {
      throw new Error(t("noDepartmentProvided"));
    }
    validateUUID(departmentID, "departmentID");

    const name = data.get("name")?.toString().trim();
    if (!name) {
      throw new Error(t("departmentNameRequired"));
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const description = data.get("description")?.toString().trim() || null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!deptBefore) {
        throw new Error(t("departmentNotFound"));
      }
      await tx.department.updateMany({
        where: { id: departmentID, sessionId },
        data: { name, description },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "department",
        entityId: departmentID,
        before: { name: deptBefore.name, description: deptBefore.description },
        after: { name, description },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/");
  });
}

export async function updateDepartmentHead(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:update");
    await rateLimit("updateDepartmentHead");
    const departmentID = data.get("departmentID")?.toString();
    const personID = data.get("personID")?.toString() || null;

    if (!departmentID) {
      throw new Error(t("noDepartmentProvided"));
    }
    validateUUID(departmentID, "departmentID");
    if (personID) validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      if (personID) {
        const person = await tx.person.findFirst({ where: { id: personID, sessionId } });
        if (!person) {
          throw new Error(t("personNotFound"));
        }
      }
      const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!deptBefore) {
        throw new Error(t("departmentNotFound"));
      }
      await tx.department.updateMany({
        where: { id: departmentID, sessionId },
        data: { headId: personID },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "department",
        entityId: departmentID,
        before: { headId: deptBefore.headId },
        after: { headId: personID },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    redirect("/manageDepartments");
  });
}

export async function assignTeamToDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:assign_team");
    await rateLimit("assignTeamToDepartment");
    const departmentID = data.get("departmentID")?.toString();
    const teamID = data.get("teamID")?.toString();

    if (!departmentID) throw new Error(t("noDepartmentProvided"));
    if (!teamID) throw new Error(t("noTeamProvided"));
    validateUUID(departmentID, "departmentID");
    validateUUID(teamID, "teamID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const department = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!department) {
        throw new Error(t("departmentNotFound"));
      }
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new Error(t("teamNotFound"));
      }
      await tx.team.updateMany({
        where: { teamId: teamID, sessionId },
        data: { departmentId: departmentID },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { departmentId: teamBefore.departmentId },
        after: { departmentId: departmentID },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    redirect("/manageDepartments");
  });
}

export async function removeTeamFromDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:assign_team");
    await rateLimit("removeTeamFromDepartment");
    const teamID = data.get("teamID")?.toString();

    if (!teamID) throw new Error(t("noTeamProvided"));
    validateUUID(teamID, "teamID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new Error(t("teamNotFound"));
      }
      await tx.team.updateMany({
        where: { teamId: teamID, sessionId },
        data: { departmentId: null },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { departmentId: teamBefore.departmentId },
        after: { departmentId: null },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    redirect("/manageDepartments");
  });
}

export async function resetAll(): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("data:reset");
    await rateLimit("resetAll");
    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
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
      auditEntries.push({
        ...ctx,
        action: "reset",
        entityType: "person",
        before: counts,
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/");
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/leave");
  });
}

export async function seedMockData(clearExisting: boolean = true): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("data:seed");
    await rateLimit("seedMockData");
    const sessionId = await getDemoSessionId();
    const sessionWhere = { sessionId };
    await prisma.$transaction(async (prisma) => {
      if (clearExisting) {
        await prisma.leaveRequest.deleteMany({ where: sessionWhere });
        await prisma.leaveBalance.deleteMany({ where: sessionWhere });
        await prisma.leaveType.deleteMany({ where: sessionWhere });
        await prisma.teamMember.deleteMany({ where: sessionWhere });
        await prisma.team.deleteMany({ where: sessionWhere });
        await prisma.department.deleteMany({ where: sessionWhere });
        await prisma.person.deleteMany({ where: sessionWhere });
      }

      // Upsert persons — find existing by email or create new
      const personSeeds = [
        { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
        { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
        { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
        { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
        { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
        { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
      ];
      const persons = [];
      for (const p of personSeeds) {
        const existing = await prisma.person.findFirst({
          where: { email: p.email, deletedAt: null, sessionId },
        });
        const person = existing ?? (await prisma.person.create({ data: { ...p, sessionId } }));
        persons.push(person);
      }
      const [alice, bob, carol, dave, eve, frank] = persons;

      // Upsert teams — find existing by name or create new
      const teamSeeds = [
        { teamName: "Engineering", teamManagerId: alice.id },
        { teamName: "Design", teamManagerId: carol.id },
        { teamName: "Platform", teamManagerId: dave.id },
      ];
      const teams = [];
      for (const t of teamSeeds) {
        const existing = await prisma.team.findFirst({
          where: { teamName: t.teamName, deletedAt: null, sessionId },
        });
        const team = existing ?? (await prisma.team.create({ data: { ...t, sessionId } }));
        teams.push(team);
      }
      const [engineering, design, platform] = teams;

      // Add members — skip if already a member
      const memberships = [
        { personId: alice.id, teamId: engineering.teamId },
        { personId: bob.id, teamId: engineering.teamId },
        { personId: eve.id, teamId: engineering.teamId },
        { personId: carol.id, teamId: design.teamId },
        { personId: frank.id, teamId: design.teamId },
        { personId: dave.id, teamId: platform.teamId },
        { personId: bob.id, teamId: platform.teamId },
      ];
      for (const m of memberships) {
        const existing = await prisma.teamMember.findFirst({
          where: { personId: m.personId, teamId: m.teamId, deletedAt: null },
        });
        if (!existing) {
          await prisma.teamMember.create({ data: { ...m, sessionId } });
        }
      }

      // Upsert departments and assign teams
      const departmentSeeds = [
        {
          name: "Engineering",
          description: "Software development and infrastructure",
          headId: alice.id,
          teamNames: ["Engineering", "Platform"],
        },
        {
          name: "Product & Design",
          description: "Product management, UX, and design",
          headId: frank.id,
          teamNames: ["Design"],
        },
      ];
      for (const d of departmentSeeds) {
        const existingDept = await prisma.department.findFirst({
          where: { name: d.name, deletedAt: null, sessionId },
        });
        const dept =
          existingDept ??
          (await prisma.department.create({
            data: { name: d.name, description: d.description, headId: d.headId, sessionId },
          }));
        for (const teamName of d.teamNames) {
          await prisma.team.updateMany({
            where: { teamName, departmentId: null, sessionId },
            data: { departmentId: dept.id },
          });
        }
      }

      // Seed leave types
      const leaveTypeSeeds = [
        {
          name: "Annual Leave",
          description: "Paid annual vacation days",
          defaultDays: 25,
          color: "#4caf50",
        },
        { name: "Sick Leave", description: "Paid sick days", defaultDays: 10, color: "#f44336" },
        {
          name: "Parental Leave",
          description: "Maternity or paternity leave",
          defaultDays: 90,
          color: "#9c27b0",
        },
        {
          name: "Unpaid Leave",
          description: "Leave without pay",
          defaultDays: 0,
          color: "#757575",
        },
      ];
      const leaveTypes = [];
      for (const lt of leaveTypeSeeds) {
        const existing = await prisma.leaveType.findFirst({
          where: { name: lt.name, deletedAt: null, sessionId },
        });
        const leaveType =
          existing ?? (await prisma.leaveType.create({ data: { ...lt, sessionId } }));
        leaveTypes.push(leaveType);
      }
      const [annualLeave, sickLeave] = leaveTypes;

      // Seed leave balances for current year
      const currentYear = new Date().getFullYear();
      for (const person of persons) {
        for (const lt of leaveTypes) {
          const existing = await prisma.leaveBalance.findUnique({
            where: {
              personId_leaveTypeId_year: {
                personId: person.id,
                leaveTypeId: lt.id,
                year: currentYear,
              },
            },
          });
          if (!existing) {
            await prisma.leaveBalance.create({
              data: {
                personId: person.id,
                leaveTypeId: lt.id,
                year: currentYear,
                allocated: lt.defaultDays,
                used: 0,
                sessionId,
              },
            });
          }
        }
      }

      // Seed a few sample leave requests
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 86400000);
      const nextNextWeek = new Date(today.getTime() + 14 * 86400000);

      // Alice: approved annual leave next week (5 days)
      await prisma.leaveRequest.create({
        data: {
          personId: alice.id,
          leaveTypeId: annualLeave.id,
          startDate: nextWeek,
          endDate: new Date(nextWeek.getTime() + 4 * 86400000),
          days: 5,
          note: "Family vacation",
          status: "approved",
          reviewerId: frank.id,
          reviewedAt: today,
          sessionId,
        },
      });

      // Bob: pending sick leave
      await prisma.leaveRequest.create({
        data: {
          personId: bob.id,
          leaveTypeId: sickLeave.id,
          startDate: nextNextWeek,
          endDate: new Date(nextNextWeek.getTime() + 1 * 86400000),
          days: 2,
          note: "Medical appointment",
          status: "pending",
          sessionId,
        },
      });

      // Update Alice's annual leave balance to reflect approved leave
      await prisma.leaveBalance.update({
        where: {
          personId_leaveTypeId_year: {
            personId: alice.id,
            leaveTypeId: annualLeave.id,
            year: currentYear,
          },
        },
        data: { used: 5 },
      });
    });

    // Seed mock users only for real (non-demo) sessions — the User table has no
    // sessionId column, so mock users would leak into the global table and be visible
    // across sessions. Demo sessions only see demo@hrmanager.app via getUsers() anyway.
    if (!sessionId) {
      const mockUserSeeds = [
        { email: "admin@example.com", name: "Jane Admin", role: "administrator" },
        { email: "user1@example.com", name: "John User", role: "user" },
        { email: "user2@example.com", name: "Sarah User", role: "user" },
        { email: "guest@example.com", name: "Demo Guest", role: "guest" },
      ];

      if (clearExisting) {
        await prisma.$transaction(async (tx) => {
          await tx.userPermission.deleteMany({
            where: { user: { email: { endsWith: "@example.com" } } },
          });
          await tx.user.deleteMany({
            where: { email: { endsWith: "@example.com" } },
          });
        });
      }

      await seedPermissions();

      await prisma.$transaction(async (tx) => {
        for (const u of mockUserSeeds) {
          const user = await tx.user.upsert({
            where: { email: u.email },
            update: {},
            create: u,
          });

          // Give admin@example.com a custom override: grant data:seed
          if (u.email === "admin@example.com") {
            const seedPerm = await tx.permission.findUnique({ where: { key: "data:seed" } });
            if (seedPerm) {
              await tx.userPermission.upsert({
                where: { userId_permissionId: { userId: user.id, permissionId: seedPerm.id } },
                update: { granted: true },
                create: { userId: user.id, permissionId: seedPerm.id, granted: true },
              });
            }
          }

          // Give user1@example.com a custom override: grant person:create
          if (u.email === "user1@example.com") {
            const createPerm = await tx.permission.findUnique({
              where: { key: "person:create" },
            });
            if (createPerm) {
              await tx.userPermission.upsert({
                where: { userId_permissionId: { userId: user.id, permissionId: createPerm.id } },
                update: { granted: true },
                create: { userId: user.id, permissionId: createPerm.id, granted: true },
              });
            }
          }
        }
      });
    } else {
      // Demo sessions still need permissions seeded for the permission catalog
      await seedPermissions();
    }

    await deferAuditLog({
      action: "seed",
      entityType: "person",
      after: { clearExisting },
    });

    revalidatePath("/");
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/admin");
  });
}

export async function initializePermissions() {
  await requirePermission("admin:manage_users");
  await rateLimit("initializePermissions");
  await seedPermissions();
}

export async function updateUserRole(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_users");
    await rateLimit("updateUserRole");

    const userId = data.get("userId")?.toString();
    const newRole = data.get("role")?.toString();

    if (!userId) throw new Error(t("noUserProvided"));
    if (!newRole) throw new Error(t("noRoleProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const validRoles = demoSessionId
      ? ["superuser", "administrator", "user", "guest"]
      : ["administrator", "user", "guest"];
    if (!validRoles.includes(newRole)) {
      throw new Error(t("invalidRole"));
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new Error(t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new Error(t("cannotChangeSuperuserRole"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole, permissionsVersion: { increment: 1 } },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: userId,
        before: { role: targetUser.role, targetEmail: targetUser.email },
        after: { role: newRole, targetEmail: targetUser.email },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function updateUserPermission(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:assign_permissions");
    await rateLimit("updateUserPermission");

    const userId = data.get("userId")?.toString();
    const permissionKey = data.get("permissionKey")?.toString();
    const action = data.get("action")?.toString();

    if (!userId) throw new Error(t("noUserProvided"));
    if (!permissionKey) throw new Error(t("noPermissionProvided"));
    if (!action) throw new Error(t("noActionProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new Error(t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new Error(t("cannotModifySuperuserPermissions"));
    }

    const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
    if (!permission) throw new Error(t("permissionNotFound"));

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      if (action === "reset") {
        await tx.userPermission.deleteMany({
          where: { userId, permissionId: permission.id },
        });
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "userPermission",
          entityId: userId,
          before: { permissionKey, action: "reset", targetEmail: targetUser.email },
        });
      } else {
        const granted = action === "grant";
        await tx.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: permission.id,
            },
          },
          update: { granted },
          create: { userId, permissionId: permission.id, granted },
        });
        auditEntries.push({
          ...ctx,
          action: "update",
          entityType: "userPermission",
          entityId: userId,
          after: { permissionKey, granted, targetEmail: targetUser.email },
        });
      }
      // Bump version so JWT callback detects the change
      await tx.user.update({
        where: { id: userId },
        data: { permissionsVersion: { increment: 1 } },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function kickOutUser(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_users");
    await rateLimit("kickOutUser");

    const userId = data.get("userId")?.toString();
    if (!userId) throw new Error(t("noUserProvided"));
    validateUUID(userId, "userId");

    const session = await auth();
    const demoSessionId = await getDemoSessionId();

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new Error(t("userNotFound"));
    if (targetUser.role === "superuser") {
      throw new Error(t("cannotKickSuperuser"));
    }
    // Demo sessions can only kick the demo user — prevent deleting real OAuth users
    if (demoSessionId && targetUser.email !== "demo@hrmanager.app") {
      throw new Error(t("demoCannotManageUsers"));
    }
    // Prevent self-kick — deleting your own user orphans the session
    if (session?.user?.id === userId) {
      throw new Error(t("cannotKickYourself"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      auditEntries.push({
        ...ctx,
        action: "kickout",
        entityType: "user",
        entityId: userId,
        before: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function updateProfileName(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new Error(t("notAuthenticated"));
    await rateLimit("updateProfileName");

    const name = data.get("name")?.toString();
    if (!name || name.trim().length === 0) throw new Error(t("nameRequired"));
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new Error(t("userNotFound"));

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: user.id,
        before: { name: user.name },
        after: { name: name.trim() },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/profile");
    revalidatePath("/");
  });
}

export async function updateProfileImage(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new Error(t("notAuthenticated"));
    await rateLimit("updateProfileImage");

    const image = data.get("image")?.toString() ?? "";
    const trimmed = image.trim();

    if (trimmed.length > 0) {
      if (trimmed.length > MAX_URL_LENGTH) {
        throw new Error(t("urlTooLong", { max: MAX_URL_LENGTH }));
      }
      let parsedUrl: URL | null = null;
      try {
        parsedUrl = new URL(trimmed);
      } catch {
        throw new Error(t("invalidUrlFormat"));
      }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error(t("invalidUrlProtocol"));
      }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new Error(t("userNotFound"));

    const newImage = trimmed.length > 0 ? trimmed : null;

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { image: newImage },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: user.id,
        before: { image: user.image },
        after: { image: newImage },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/profile");
    revalidatePath("/");
  });
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; field: string; message: string }[];
}

export async function importPersonsCsv(
  _prevState: { error?: string; result?: ImportResult } | null,
  data: FormData,
): Promise<{ error?: string; result?: ImportResult }> {
  await requirePermission("data:import");
  await rateLimit("importPersonsCsv");
  const t = await getTranslations("errors");

  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("csvNoFile") };
  }
  if (!file.name.endsWith(".csv")) {
    return { error: t("csvNotCsvFile") };
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { error: t("csvFileTooLarge") };
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length <= 1) {
    return { error: t("csvEmpty") };
  }
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { error: t("csvTooManyRows", { max: MAX_IMPORT_ROWS }) };
  }

  const sessionId = await getDemoSessionId();

  const existingPersons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    select: { email: true },
  });
  const existingEmails = new Set(
    existingPersons.map((p) => p.email?.toLowerCase()).filter(Boolean) as string[],
  );

  const { valid, errors, skipped } = validatePersonImportRows(rows, existingEmails);

  if (valid.length === 0 && errors.length > 0) {
    return { result: { imported: 0, skipped, errors } };
  }

  let imported = 0;
  if (valid.length > 0) {
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      for (const row of valid) {
        const person = await tx.person.create({
          data: {
            name: row.name,
            email: row.email,
            position: row.position ?? null,
            sessionId,
          },
        });
        auditEntries.push({
          ...ctx,
          action: "import",
          entityType: "person",
          entityId: person.id,
          after: { name: person.name, email: person.email, position: person.position },
        });
        imported++;
      }
    });
    deferAudit(auditEntries);
  }

  revalidatePath("/managePersons");
  revalidatePath("/");
  revalidatePath("/admin/data");
  return { result: { imported, skipped, errors } };
}

export async function exportPersonsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportPersonsCsv");

  const sessionId = await getDemoSessionId();
  const persons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    orderBy: { name: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "person",
    after: { rowCount: persons.length },
  });

  return generateCSV(
    ["name", "email", "position", "createdAt"],
    persons.map((p) => [p.name, p.email ?? "", p.position ?? "", p.createdAt.toISOString()]),
  );
}

export async function exportTeamsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportTeamsCsv");

  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      manager: true,
      department: true,
      members: {
        where: { deletedAt: null },
        include: { person: true },
      },
    },
    orderBy: { teamName: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "team",
    after: { rowCount: teams.length },
  });

  return generateCSV(
    ["name", "manager", "department", "memberCount", "members", "createdAt"],
    teams.map((t) => [
      t.teamName,
      t.manager?.name ?? "",
      t.department?.name ?? "",
      t.members.length.toString(),
      t.members.map((m) => m.person.name).join("; "),
      t.createdAt.toISOString(),
    ]),
  );
}

export async function exportDepartmentsCsv(): Promise<string> {
  await requirePermission("data:export");
  await rateLimit("exportDepartmentsCsv");

  const sessionId = await getDemoSessionId();
  const departments = await prisma.department.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      head: true,
      teams: { where: { deletedAt: null } },
    },
    orderBy: { name: "asc" },
  });

  await deferAuditLog({
    action: "export",
    entityType: "department",
    after: { rowCount: departments.length },
  });

  return generateCSV(
    ["name", "description", "head", "teamCount", "teams", "createdAt"],
    departments.map((d) => [
      d.name,
      d.description ?? "",
      d.head?.name ?? "",
      d.teams.length.toString(),
      d.teams.map((t) => t.teamName).join("; "),
      d.createdAt.toISOString(),
    ]),
  );
}

export async function exportAuditLogsCsv(): Promise<string> {
  await requirePermission("admin:view_audit_log");
  await requirePermission("data:export");
  await rateLimit("exportAuditLogsCsv");

  const sessionId = await getDemoSessionId();
  const MAX_EXPORT_ROWS = 10000;
  const { getAuditLogCollection, isMongoAvailable } = await import("@/mongoDb");
  const logs = isMongoAvailable()
    ? await getAuditLogCollection()
        .find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(MAX_EXPORT_ROWS)
        .toArray()
    : [];

  return generateCSV(
    ["timestamp", "userEmail", "action", "entityType", "entityId", "before", "after"],
    logs.map((l) => [
      l.createdAt.toISOString(),
      l.userEmail ?? "",
      l.action,
      l.entityType,
      l.entityId ?? "",
      l.before ?? "",
      l.after ?? "",
    ]),
  );
}

// ─── Leave Management ────────────────────────────────────────────

export async function createLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("createLeaveType");

    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) throw new Error(t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;
    if (descStr && descStr.length > MAX_DESCRIPTION_LENGTH)
      throw new Error(t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }));

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0) throw new Error(t("invalidDaysValue"));

    const color = (data.get("color")?.valueOf() as string) ?? "#1976d2";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId },
      });
      if (existing) throw new Error(t("leaveTypeAlreadyExists"));

      const leaveType = await tx.leaveType.create({
        data: { name: name.trim(), description: descStr, defaultDays, color, sessionId },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "leaveType",
        entityId: leaveType.id,
        after: { name: leaveType.name, defaultDays, color },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function updateLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("updateLeaveType");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new Error(t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) throw new Error(t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0) throw new Error(t("invalidDaysValue"));

    const color = (data.get("color")?.valueOf() as string) ?? "#1976d2";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new Error(t("leaveTypeNotFound"));

      const duplicate = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId, NOT: { id } },
      });
      if (duplicate) throw new Error(t("leaveTypeAlreadyExists"));

      await tx.leaveType.update({
        where: { id },
        data: { name: name.trim(), description: descStr, defaultDays, color },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name, defaultDays: existing.defaultDays, color: existing.color },
        after: { name: name.trim(), defaultDays, color },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function deleteLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("deleteLeaveType");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new Error(t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new Error(t("leaveTypeNotFound"));

      await tx.leaveType.update({ where: { id }, data: { deletedAt: now } });
      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function createLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:request");
    await rateLimit("createLeaveRequest");

    const personId = data.get("personId")?.valueOf();
    if (typeof personId !== "string") throw new Error(t("noPersonSelected"));
    validateUUID(personId, "personId");

    const leaveTypeId = data.get("leaveTypeId")?.valueOf();
    if (typeof leaveTypeId !== "string") throw new Error(t("leaveTypeRequired"));
    validateUUID(leaveTypeId, "leaveTypeId");

    const startDateStr = data.get("startDate")?.valueOf();
    const endDateStr = data.get("endDate")?.valueOf();
    if (typeof startDateStr !== "string" || typeof endDateStr !== "string")
      throw new Error(t("invalidDateRange"));

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
      throw new Error(t("invalidDateRange"));
    if (endDate < startDate) throw new Error(t("endDateBeforeStartDate"));

    const daysStr = data.get("days")?.valueOf();
    const days = typeof daysStr === "string" ? parseInt(daysStr, 10) : 0;
    if (isNaN(days) || days < 1) throw new Error(t("invalidDaysValue"));

    const note = data.get("note")?.valueOf();
    const noteStr = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    if (noteStr && noteStr.length > MAX_LEAVE_NOTE_LENGTH)
      throw new Error(t("noteTooLong", { max: MAX_LEAVE_NOTE_LENGTH }));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.findFirst({
        where: { id: personId, deletedAt: null, sessionId },
      });
      if (!person) throw new Error(t("personNotFound"));

      const leaveType = await tx.leaveType.findFirst({
        where: { id: leaveTypeId, deletedAt: null, sessionId },
      });
      if (!leaveType) throw new Error(t("leaveTypeNotFound"));

      // Check for overlapping leave requests
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          personId,
          deletedAt: null,
          sessionId,
          status: { not: "rejected" },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });
      if (overlapping) throw new Error(t("leaveRequestOverlapping"));

      // Check balance
      const year = startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: { personId_leaveTypeId_year: { personId, leaveTypeId, year } },
      });
      if (balance && balance.allocated - balance.used < days)
        throw new Error(t("insufficientLeaveBalance"));

      const request = await tx.leaveRequest.create({
        data: {
          personId,
          leaveTypeId,
          startDate,
          endDate,
          days,
          note: noteStr,
          sessionId,
        },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "leaveRequest",
        entityId: request.id,
        after: {
          personName: person.name,
          leaveType: leaveType.name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function reviewLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:approve");
    await rateLimit("reviewLeaveRequest");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new Error(t("invalidId"));
    validateUUID(id, "leaveRequestId");

    const action = data.get("action")?.valueOf();
    if (action !== "approved" && action !== "rejected") throw new Error(t("invalidLeaveAction"));

    const reviewerId = data.get("reviewerId")?.valueOf();
    const reviewerIdStr = typeof reviewerId === "string" ? reviewerId : null;
    if (reviewerIdStr) validateUUID(reviewerIdStr, "reviewerId");

    const reviewNote = data.get("reviewNote")?.valueOf();
    const reviewNoteStr =
      typeof reviewNote === "string" && reviewNote.trim().length > 0 ? reviewNote.trim() : null;
    if (reviewNoteStr && reviewNoteStr.length > MAX_LEAVE_NOTE_LENGTH)
      throw new Error(t("noteTooLong", { max: MAX_LEAVE_NOTE_LENGTH }));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id, deletedAt: null, sessionId, status: "pending" },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new Error(t("leaveRequestNotFound"));

      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: action,
          reviewerId: reviewerIdStr,
          reviewNote: reviewNoteStr,
          reviewedAt: new Date(),
        },
      });

      // If approved, update the balance
      if (action === "approved") {
        const year = request.startDate.getFullYear();
        await tx.leaveBalance.upsert({
          where: {
            personId_leaveTypeId_year: {
              personId: request.personId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          create: {
            personId: request.personId,
            leaveTypeId: request.leaveTypeId,
            year,
            allocated: request.leaveType.defaultDays,
            used: request.days,
            sessionId,
          },
          update: { used: { increment: request.days } },
        });
      }

      auditEntries.push({
        ...ctx,
        action: action === "approved" ? "approve" : "reject",
        entityType: "leaveRequest",
        entityId: id,
        before: { status: "pending" },
        after: {
          status: action,
          personName: request.person.name,
          leaveType: request.leaveType.name,
          days: request.days,
          reviewNote: reviewNoteStr,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function deleteLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:request");
    await rateLimit("deleteLeaveRequest");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new Error(t("invalidId"));
    validateUUID(id, "leaveRequestId");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id, deletedAt: null, sessionId },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new Error(t("leaveRequestNotFound"));
      if (request.status !== "pending") throw new Error(t("cannotDeleteNonPendingRequest"));

      await tx.leaveRequest.update({ where: { id }, data: { deletedAt: now } });
      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "leaveRequest",
        entityId: id,
        before: {
          personName: request.person.name,
          leaveType: request.leaveType.name,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate.toISOString(),
          days: request.days,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function allocateLeaveBalance(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("allocateLeaveBalance");

    const personId = data.get("personId")?.valueOf();
    if (typeof personId !== "string") throw new Error(t("noPersonSelected"));
    validateUUID(personId, "personId");

    const leaveTypeId = data.get("leaveTypeId")?.valueOf();
    if (typeof leaveTypeId !== "string") throw new Error(t("leaveTypeRequired"));
    validateUUID(leaveTypeId, "leaveTypeId");

    const yearStr = data.get("year")?.valueOf();
    const year = typeof yearStr === "string" ? parseInt(yearStr, 10) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100) throw new Error(t("invalidYear"));

    const allocatedStr = data.get("allocated")?.valueOf();
    const allocated = typeof allocatedStr === "string" ? parseInt(allocatedStr, 10) : 0;
    if (isNaN(allocated) || allocated < 0) throw new Error(t("invalidDaysValue"));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.findFirst({
        where: { id: personId, deletedAt: null, sessionId },
      });
      if (!person) throw new Error(t("personNotFound"));

      const leaveType = await tx.leaveType.findFirst({
        where: { id: leaveTypeId, deletedAt: null, sessionId },
      });
      if (!leaveType) throw new Error(t("leaveTypeNotFound"));

      const balance = await tx.leaveBalance.upsert({
        where: { personId_leaveTypeId_year: { personId, leaveTypeId, year } },
        create: { personId, leaveTypeId, year, allocated, sessionId },
        update: { allocated },
      });

      auditEntries.push({
        ...ctx,
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
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

// ============================================================
// PERFORMANCE REVIEWS
// ============================================================

export async function createReviewTemplate(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("createReviewTemplate");

    const name = data.get("name");
    const description = data.get("description");

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error(t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }
    if (description !== null && typeof description !== "string") {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          questions: [],
          sessionId,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewTemplate",
        entityId: template.id,
        after: { name: template.name },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  });
}

export async function deleteReviewTemplate(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("deleteReviewTemplate");

    const templateId = data.get("templateId");
    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new Error(t("reviewTemplateNotFound"));

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { deletedAt: new Date() },
      });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewTemplate",
        entityId: templateId,
        before: { name: template.name },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  });
}

export async function addReviewQuestion(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("addReviewQuestion");

    const templateId = data.get("templateId");
    const text = data.get("text");
    const type = data.get("type");
    const scaleMinRaw = data.get("scaleMin");
    const scaleMaxRaw = data.get("scaleMax");
    const requiredRaw = data.get("required");

    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new Error(t("unexpectedError"));
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(t("invalidName"));
    }
    if (type !== "RATING" && type !== "TEXT") {
      throw new Error(t("invalidQuestionType"));
    }

    const scaleMin = scaleMinRaw ? parseInt(String(scaleMinRaw), 10) : null;
    const scaleMax = scaleMaxRaw ? parseInt(String(scaleMaxRaw), 10) : null;
    const required = requiredRaw !== "false";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new Error(t("reviewTemplateNotFound"));

      const existingQuestions = Array.isArray(template.questions)
        ? (template.questions as ReviewQuestion[])
        : [];
      const newQuestion: ReviewQuestion = {
        id: crypto.randomUUID(),
        text: text.trim(),
        type: type as "RATING" | "TEXT",
        scaleMin: type === "RATING" ? (scaleMin ?? 1) : null,
        scaleMax: type === "RATING" ? (scaleMax ?? 5) : null,
        order: existingQuestions.length,
        required,
      };

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { questions: [...existingQuestions, newQuestion] },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { addedQuestion: newQuestion.text },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/templates/${templateId}`);
  });
}

export async function removeReviewQuestion(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("removeReviewQuestion");

    const templateId = data.get("templateId");
    const questionId = data.get("questionId");

    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new Error(t("unexpectedError"));
    }
    if (typeof questionId !== "string" || !questionId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new Error(t("reviewTemplateNotFound"));

      const existingQuestions = Array.isArray(template.questions)
        ? (template.questions as ReviewQuestion[])
        : [];
      const filtered = existingQuestions
        .filter((q) => q.id !== questionId)
        .map((q, i) => ({ ...q, order: i }));

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { questions: filtered },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { removedQuestion: questionId },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/templates/${templateId}`);
  });
}

export async function createReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("createReviewCycle");

    const name = data.get("name");
    const templateId = data.get("templateId");
    const startDateRaw = data.get("startDate");
    const endDateRaw = data.get("endDate");

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error(t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new Error(t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const startDate = startDateRaw ? new Date(String(startDateRaw)) : null;
    const endDate = endDateRaw ? new Date(String(endDateRaw)) : null;
    if (!startDate || isNaN(startDate.getTime())) {
      throw new Error(t("unexpectedError"));
    }
    if (!endDate || isNaN(endDate.getTime())) {
      throw new Error(t("unexpectedError"));
    }

    const resolvedTemplateId =
      typeof templateId === "string" && templateId.trim() ? templateId.trim() : null;

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      if (resolvedTemplateId) {
        const tpl = await tx.reviewTemplate.findFirst({
          where: { id: resolvedTemplateId, deletedAt: null, sessionId },
        });
        if (!tpl) throw new Error(t("reviewTemplateNotFound"));
      }

      const cycle = await tx.reviewCycle.create({
        data: {
          name: name.trim(),
          templateId: resolvedTemplateId,
          startDate,
          endDate,
          status: "DRAFT",
          sessionId,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewCycle",
        entityId: cycle.id,
        after: { name: cycle.name, status: cycle.status },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews");
  });
}

export async function deleteReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("deleteReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new Error(t("reviewCycleNotFound"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { deletedAt: new Date() },
      });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { name: cycle.name, status: cycle.status },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews");
  });
}

export async function openReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("openReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new Error(t("reviewCycleNotFound"));
      if (cycle.status !== "DRAFT") throw new Error(t("reviewCycleNotDraft"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { status: "OPEN" },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "DRAFT" },
        after: { status: "OPEN" },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  });
}

export async function closeReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("closeReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new Error(t("reviewCycleNotFound"));
      if (cycle.status === "CLOSED") throw new Error(t("reviewCycleAlreadyClosed"));
      if (cycle.status !== "OPEN") throw new Error(t("reviewCycleNotOpen"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { status: "CLOSED" },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "OPEN" },
        after: { status: "CLOSED" },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  });
}

export async function addReviewRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("addReviewRequest");

    const cycleId = data.get("cycleId");
    const subjectId = data.get("subjectId");
    const reviewerId = data.get("reviewerId");
    const type = data.get("type");

    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new Error(t("unexpectedError"));
    }
    if (typeof subjectId !== "string" || !subjectId.trim()) {
      throw new Error(t("noPersonSelected"));
    }
    if (typeof reviewerId !== "string" || !reviewerId.trim()) {
      throw new Error(t("noPersonSelected"));
    }
    if (!["SELF", "MANAGER", "PEER", "DIRECT_REPORT"].includes(String(type))) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new Error(t("reviewCycleNotFound"));

      const existing = await tx.reviewRequest.findUnique({
        where: {
          cycleId_subjectId_reviewerId_type: {
            cycleId,
            subjectId,
            reviewerId,
            type: type as "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT",
          },
        },
      });
      if (existing) throw new Error(t("reviewAlreadyExists"));

      const req = await tx.reviewRequest.create({
        data: {
          cycleId,
          subjectId,
          reviewerId,
          type: type as "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT",
          status: "PENDING",
          sessionId,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewRequest",
        entityId: req.id,
        after: { cycleId, type },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
  });
}

export async function removeReviewRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("removeReviewRequest");

    const requestId = data.get("requestId");
    const cycleId = data.get("cycleId");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
      });
      if (!req) throw new Error(t("reviewRequestNotFound"));

      await tx.reviewRequest.delete({ where: { id: requestId } });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewRequest",
        entityId: requestId,
        before: { type: req.type, status: req.status },
      });
    });

    deferAudit(auditEntries);
    if (typeof cycleId === "string" && cycleId.trim()) {
      revalidatePath(`/reviews/cycles/${cycleId}`);
    }
  });
}

export async function submitReview(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:submit");
    await rateLimit("submitReview");

    const requestId = data.get("requestId");
    const answersRaw = data.get("answers");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new Error(t("unexpectedError"));
    }

    let answers: Array<{
      questionId: string;
      ratingValue: number | null;
      textValue: string | null;
    }> = [];
    if (typeof answersRaw === "string") {
      try {
        answers = JSON.parse(answersRaw);
      } catch {
        throw new Error(t("unexpectedError"));
      }
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
        include: { cycle: true },
      });
      if (!req) throw new Error(t("reviewRequestNotFound"));
      if (req.status === "SUBMITTED") throw new Error(t("reviewAlreadySubmitted"));
      if (req.cycle.status !== "OPEN") throw new Error(t("reviewCycleNotOpen"));

      const submission = await tx.reviewSubmission.create({
        data: {
          requestId,
          answers,
          sessionId,
        },
      });

      await tx.reviewRequest.update({
        where: { id: requestId },
        data: { status: "SUBMITTED" },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewSubmission",
        entityId: submission.id,
        after: { requestId, answerCount: answers.length },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/my-reviews");
    revalidatePath(`/reviews/cycles/${data.get("cycleId")}`);
  });
}
