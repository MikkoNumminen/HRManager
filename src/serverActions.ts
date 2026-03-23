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
} from "@/schemas";
import { parseCSV, generateCSV, validatePersonImportRows } from "@/csvUtils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

export async function createPerson(data: FormData) {
  await requirePermission("person:create");
  await rateLimit("createPerson");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const email = data.get("email")?.valueOf();
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new Error("Email is required");
  }
  if (email.trim().length > MAX_EMAIL_LENGTH) {
    throw new Error(`Email must be ${MAX_EMAIL_LENGTH} characters or less`);
  }
  if (!EmailSchema.safeParse(email).success) {
    throw new Error("Invalid email format");
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const existingPerson = await tx.person.findFirst({
      where: { email, deletedAt: null, sessionId },
    });
    if (existingPerson) {
      throw new Error("A person with this email already exists");
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
}

export async function removePerson(data: FormData) {
  await requirePermission("person:delete");
  await rateLimit("removePerson");
  const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
  if (personIDs.length === 0) {
    throw new Error("No personID selected");
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
}

export async function updatePersonName(data: FormData) {
  await requirePermission("person:update_name");
  await rateLimit("updatePersonName");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }
  validateUUID(personID, "personID");

  const newName = data.get("name")?.toString().trim();
  if (!newName) {
    throw new Error("New name is missing");
  }
  if (newName.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const personBefore = await tx.person.findFirst({
      where: { id: personID, sessionId },
    });
    if (!personBefore) {
      throw new Error("Person not found");
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
}

export async function updatePosition(data: FormData) {
  await requirePermission("person:update_position");
  await rateLimit("updatePosition");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }
  validateUUID(personID, "personID");

  const newPosition = (data.get("position") ?? data.get("name"))?.toString().trim();
  if (!newPosition) {
    throw new Error("New position is missing");
  }
  if (newPosition.length > MAX_POSITION_LENGTH) {
    throw new Error(`Position must be ${MAX_POSITION_LENGTH} characters or less`);
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const personBefore = await tx.person.findFirst({
      where: { id: personID, sessionId },
    });
    if (!personBefore) {
      throw new Error("Person not found");
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
}

export async function updateEmail(data: FormData) {
  await requirePermission("person:update_email");
  await rateLimit("updateEmail");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(personID, "personID");

  const newEmail = (data.get("email") ?? data.get("name"))?.toString().trim();
  if (!newEmail) {
    throw new Error("New Email is missing");
  }
  if (newEmail.length > MAX_EMAIL_LENGTH) {
    throw new Error(`Email must be ${MAX_EMAIL_LENGTH} characters or less`);
  }
  if (!EmailSchema.safeParse(newEmail).success) {
    throw new Error("Invalid email format");
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const existingPerson = await tx.person.findFirst({
      where: { email: newEmail, deletedAt: null, sessionId },
    });
    if (existingPerson && existingPerson.id !== personID) {
      throw new Error("A person with this email already exists");
    }

    const personBefore = await tx.person.findFirst({
      where: { id: personID, sessionId },
    });
    if (!personBefore) {
      throw new Error("Person not found");
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
}

export async function addManager(data: FormData) {
  await requirePermission("team:update_manager");
  await rateLimit("addManager");
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  const personID = data.get("personID")?.toString();

  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID provided");
  }
  teamIDs.forEach((id) => validateUUID(id, "teamID"));
  validateUUID(personID, "personID");

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const person = await tx.person.findFirst({ where: { id: personID, sessionId } });
    if (!person) {
      throw new Error("Person not found");
    }

    for (const teamID of teamIDs) {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new Error("Team not found");
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
}

export async function addMember(data: FormData) {
  await requirePermission("team:add_member");
  await rateLimit("addMember");
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
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
      throw new Error("Person is already a member of the team");
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
}

export async function createTeam(data: FormData) {
  await requirePermission("team:create");
  await rateLimit("createTeam");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
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
}

export async function updateTeamName(data: FormData) {
  await requirePermission("team:update_name");
  await rateLimit("updateTeamName");
  const teamID = data.get("teamID")?.toString();
  if (!teamID) {
    throw new Error("No teamID provided");
  }
  validateUUID(teamID, "teamID");

  const newName = data.get("name")?.toString().trim();
  if (!newName) {
    throw new Error("New team name is missing");
  }
  if (newName.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
    if (!teamBefore) {
      throw new Error("Team not found");
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
}

export async function removeTeam(data: FormData) {
  await requirePermission("team:delete");
  await rateLimit("removeTeam");
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
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
}

export async function removeMember(data: FormData) {
  await requirePermission("team:remove_member");
  await rateLimit("removeMember");
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
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
      throw new Error("Person is not a member of the team");
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
}

export async function createDepartment(data: FormData) {
  await requirePermission("department:create");
  await rateLimit("createDepartment");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const description = data.get("description")?.toString().trim() || null;
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
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
}

export async function removeDepartment(data: FormData) {
  await requirePermission("department:delete");
  await rateLimit("removeDepartment");
  const departmentIDs = data
    .getAll("departmentID")
    .filter((v): v is string => typeof v === "string");
  if (departmentIDs.length === 0) {
    throw new Error("No departmentID selected");
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
}

export async function updateDepartment(data: FormData) {
  await requirePermission("department:update");
  await rateLimit("updateDepartment");
  const departmentID = data.get("departmentID")?.toString();
  if (!departmentID) {
    throw new Error("No departmentID provided");
  }
  validateUUID(departmentID, "departmentID");

  const name = data.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Department name is required");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const description = data.get("description")?.toString().trim() || null;
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
  }

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
    if (!deptBefore) {
      throw new Error("Department not found");
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
}

export async function updateDepartmentHead(data: FormData) {
  await requirePermission("department:update");
  await rateLimit("updateDepartmentHead");
  const departmentID = data.get("departmentID")?.toString();
  const personID = data.get("personID")?.toString() || null;

  if (!departmentID) {
    throw new Error("No departmentID provided");
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
        throw new Error("Person not found");
      }
    }
    const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
    if (!deptBefore) {
      throw new Error("Department not found");
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
}

export async function assignTeamToDepartment(data: FormData) {
  await requirePermission("department:assign_team");
  await rateLimit("assignTeamToDepartment");
  const departmentID = data.get("departmentID")?.toString();
  const teamID = data.get("teamID")?.toString();

  if (!departmentID) throw new Error("No departmentID provided");
  if (!teamID) throw new Error("No teamID provided");
  validateUUID(departmentID, "departmentID");
  validateUUID(teamID, "teamID");

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const department = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
    if (!department) {
      throw new Error("Department not found");
    }
    const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
    if (!teamBefore) {
      throw new Error("Team not found");
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
}

export async function removeTeamFromDepartment(data: FormData) {
  await requirePermission("department:assign_team");
  await rateLimit("removeTeamFromDepartment");
  const teamID = data.get("teamID")?.toString();

  if (!teamID) throw new Error("No teamID provided");
  validateUUID(teamID, "teamID");

  const sessionId = await getDemoSessionId();
  const ctx = await captureAuditContext();
  const auditEntries: DeferredAuditEntry[] = [];
  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
    if (!teamBefore) {
      throw new Error("Team not found");
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
}

export async function resetAll() {
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
}

export async function seedMockData(clearExisting: boolean = true) {
  await requirePermission("data:seed");
  await rateLimit("seedMockData");
  const sessionId = await getDemoSessionId();
  const sessionWhere = { sessionId };
  await prisma.$transaction(async (prisma) => {
    if (clearExisting) {
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
}

export async function initializePermissions() {
  await requirePermission("admin:manage_users");
  await rateLimit("initializePermissions");
  await seedPermissions();
}

export async function updateUserRole(data: FormData) {
  await requirePermission("admin:manage_users");
  await rateLimit("updateUserRole");

  const userId = data.get("userId")?.toString();
  const newRole = data.get("role")?.toString();

  if (!userId) throw new Error("No userId provided");
  if (!newRole) throw new Error("No role provided");
  validateUUID(userId, "userId");

  const demoSessionId = await getDemoSessionId();
  const validRoles = demoSessionId
    ? ["superuser", "administrator", "user", "guest"]
    : ["administrator", "user", "guest"];
  if (!validRoles.includes(newRole)) {
    throw new Error("Invalid role. Cannot assign superuser role through the UI.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found");
  if (!demoSessionId && targetUser.role === "superuser") {
    throw new Error("Cannot change the superuser's role");
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
}

export async function updateUserPermission(data: FormData) {
  await requirePermission("admin:assign_permissions");
  await rateLimit("updateUserPermission");

  const userId = data.get("userId")?.toString();
  const permissionKey = data.get("permissionKey")?.toString();
  const action = data.get("action")?.toString();

  if (!userId) throw new Error("No userId provided");
  if (!permissionKey) throw new Error("No permissionKey provided");
  if (!action) throw new Error("No action provided");
  validateUUID(userId, "userId");

  const demoSessionId = await getDemoSessionId();
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found");
  if (!demoSessionId && targetUser.role === "superuser") {
    throw new Error("Cannot modify superuser permissions");
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) throw new Error("Permission not found");

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
}

export async function kickOutUser(data: FormData) {
  await requirePermission("admin:manage_users");
  await rateLimit("kickOutUser");

  const userId = data.get("userId")?.toString();
  if (!userId) throw new Error("No userId provided");
  validateUUID(userId, "userId");

  const session = await auth();
  const demoSessionId = await getDemoSessionId();

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found");
  if (targetUser.role === "superuser") {
    throw new Error("Cannot kick out the superuser");
  }
  // Demo sessions can only kick the demo user — prevent deleting real OAuth users
  if (demoSessionId && targetUser.email !== "demo@hrmanager.app") {
    throw new Error("Demo sessions cannot manage real users");
  }
  // Prevent self-kick — deleting your own user orphans the session
  if (session?.user?.id === userId) {
    throw new Error("Cannot kick yourself out");
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
}

export async function updateProfileName(data: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  await rateLimit("updateProfileName");

  const name = data.get("name")?.toString();
  if (!name || name.trim().length === 0) throw new Error("Name is required");
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or less`);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("User not found");

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
}

export async function updateProfileImage(data: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  await rateLimit("updateProfileImage");

  const image = data.get("image")?.toString() ?? "";
  const trimmed = image.trim();

  if (trimmed.length > 0) {
    if (trimmed.length > MAX_URL_LENGTH) {
      throw new Error(`URL must be ${MAX_URL_LENGTH} characters or less`);
    }
    try {
      const url = new URL(trimmed);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("URL must use http or https protocol");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("protocol")) throw e;
      throw new Error("Invalid URL format");
    }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("User not found");

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

  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a CSV file" };
  }
  if (!file.name.endsWith(".csv")) {
    return { error: "File must be a .csv file" };
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { error: "File exceeds 1 MB limit" };
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length <= 1) {
    return { error: "CSV file is empty or contains only headers" };
  }
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return { error: `Maximum ${MAX_IMPORT_ROWS} rows per import` };
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
  const logs = await prisma.auditLog.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: MAX_EXPORT_ROWS,
  });

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
