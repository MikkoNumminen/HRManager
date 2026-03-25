"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export async function createDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:create");
    await rateLimit("createDepartment");
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const description = data.get("description")?.toString().trim() || null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ActionError(
        "descriptionTooLong",
        t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }),
      );
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
    invalidateDashboardCache();
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
      throw new ActionError("noDepartmentSelected", t("noDepartmentSelected"));
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
    invalidateDashboardCache();
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
      throw new ActionError("noDepartmentProvided", t("noDepartmentProvided"));
    }
    validateUUID(departmentID, "departmentID");

    const name = data.get("name")?.toString().trim();
    if (!name) {
      throw new ActionError("departmentNameRequired", t("departmentNameRequired"));
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const description = data.get("description")?.toString().trim() || null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ActionError(
        "descriptionTooLong",
        t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }),
      );
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!deptBefore) {
        throw new ActionError("departmentNotFound", t("departmentNotFound"));
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
    invalidateDashboardCache();
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
      throw new ActionError("noDepartmentProvided", t("noDepartmentProvided"));
    }
    validateUUID(departmentID, "departmentID");
    if (personID) validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      if (personID) {
        const person = await tx.person.findFirst({
          where: { id: personID, deletedAt: null, sessionId },
        });
        if (!person) {
          throw new ActionError("personNotFound", t("personNotFound"));
        }
      }
      const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!deptBefore) {
        throw new ActionError("departmentNotFound", t("departmentNotFound"));
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
    invalidateDashboardCache();
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

    if (!departmentID) throw new ActionError("noDepartmentProvided", t("noDepartmentProvided"));
    if (!teamID) throw new ActionError("noTeamProvided", t("noTeamProvided"));
    validateUUID(departmentID, "departmentID");
    validateUUID(teamID, "teamID");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const department = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!department) {
        throw new ActionError("departmentNotFound", t("departmentNotFound"));
      }
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new ActionError("teamNotFound", t("teamNotFound"));
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
    invalidateDashboardCache();
    redirect("/manageDepartments");
  });
}

export async function removeTeamFromDepartment(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("department:assign_team");
    await rateLimit("removeTeamFromDepartment");
    const teamID = data.get("teamID")?.toString();

    if (!teamID) throw new ActionError("noTeamProvided", t("noTeamProvided"));
    validateUUID(teamID, "teamID");

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
    invalidateDashboardCache();
    redirect("/manageDepartments");
  });
}
