"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";

export const createDepartment: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:create",
  "createDepartment",
  async (t, data: FormData) => {
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
    await withAuditedTransaction(async (tx, addAudit) => {
      const department = await tx.department.create({
        data: {
          name: name.trim(),
          description,
          sessionId,
        },
      });
      addAudit({
        action: "create",
        entityType: "department",
        entityId: department.id,
        after: { name: department.name, description: department.description },
      });
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const removeDepartment: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:delete",
  "removeDepartment",
  async (t, data: FormData) => {
    const departmentIDs = data
      .getAll("departmentID")
      .filter((v): v is string => typeof v === "string");
    if (departmentIDs.length === 0) {
      throw new ActionError("noDepartmentSelected", t("noDepartmentSelected"));
    }
    departmentIDs.forEach((id) => validateUUID(id, "departmentID"));

    const sessionId = await getDemoSessionId();
    const now = new Date();
    await withAuditedTransaction(async (tx, addAudit) => {
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
        addAudit({
          action: "delete",
          entityType: "department",
          entityId: dept.id,
          before: { name: dept.name, description: dept.description },
        });
      }
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageDepartments");
  },
);

export const updateDepartment: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:update",
  "updateDepartment",
  async (t, data: FormData) => {
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
    await withAuditedTransaction(async (tx, addAudit) => {
      const deptBefore = await tx.department.findFirst({ where: { id: departmentID, sessionId } });
      if (!deptBefore) {
        throw new ActionError("departmentNotFound", t("departmentNotFound"));
      }
      await tx.department.updateMany({
        where: { id: departmentID, sessionId },
        data: { name, description },
      });
      addAudit({
        action: "update",
        entityType: "department",
        entityId: departmentID,
        before: { name: deptBefore.name, description: deptBefore.description },
        after: { name, description },
      });
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    invalidateDashboardCache();
  },
);

export const updateDepartmentHead: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:update",
  "updateDepartmentHead",
  async (t, data: FormData) => {
    const departmentID = data.get("departmentID")?.toString();
    const personID = data.get("personID")?.toString() || null;

    if (!departmentID) {
      throw new ActionError("noDepartmentProvided", t("noDepartmentProvided"));
    }
    validateUUID(departmentID, "departmentID");
    if (personID) validateUUID(personID, "personID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
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
      addAudit({
        action: "update",
        entityType: "department",
        entityId: departmentID,
        before: { headId: deptBefore.headId },
        after: { headId: personID },
      });
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageDepartments");
  },
);

export const assignTeamToDepartment: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:assign_team",
  "assignTeamToDepartment",
  async (t, data: FormData) => {
    const departmentID = data.get("departmentID")?.toString();
    const teamID = data.get("teamID")?.toString();

    if (!departmentID) throw new ActionError("noDepartmentProvided", t("noDepartmentProvided"));
    if (!teamID) throw new ActionError("noTeamProvided", t("noTeamProvided"));
    validateUUID(departmentID, "departmentID");
    validateUUID(teamID, "teamID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
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
      addAudit({
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { departmentId: teamBefore.departmentId },
        after: { departmentId: departmentID },
      });
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageDepartments");
  },
);

export const removeTeamFromDepartment: (data: FormData) => Promise<ActionResult> = guardedAction(
  "department:assign_team",
  "removeTeamFromDepartment",
  async (t, data: FormData) => {
    const teamID = data.get("teamID")?.toString();

    if (!teamID) throw new ActionError("noTeamProvided", t("noTeamProvided"));
    validateUUID(teamID, "teamID");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const teamBefore = await tx.team.findFirst({ where: { teamId: teamID, sessionId } });
      if (!teamBefore) {
        throw new ActionError("teamNotFound", t("teamNotFound"));
      }
      await tx.team.updateMany({
        where: { teamId: teamID, sessionId },
        data: { departmentId: null },
      });
      addAudit({
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { departmentId: teamBefore.departmentId },
        after: { departmentId: null },
      });
    });
    revalidatePath("/manageDepartments");
    revalidatePath("/manageTeams");
    revalidatePath("/");
    invalidateDashboardCache();
    redirect("/manageDepartments");
  },
);
