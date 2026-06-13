"use server";
// Leave type management: create, update, and soft-delete leave types.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas/shared";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { safeColor } from "@/utils/color";

export const createLeaveType: (data: FormData) => Promise<ActionResult> = guardedAction(
  "leave:manage_types",
  "createLeaveType",
  async (t, data: FormData) => {
    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0)
      throw new ActionError("invalidName", t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;
    if (descStr && descStr.length > MAX_DESCRIPTION_LENGTH)
      throw new ActionError(
        "descriptionTooLong",
        t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }),
      );

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const color = safeColor(data.get("color")?.valueOf());

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existing = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId },
      });
      if (existing) throw new ActionError("leaveTypeAlreadyExists", t("leaveTypeAlreadyExists"));

      const leaveType = await tx.leaveType.create({
        data: { name: name.trim(), description: descStr, defaultDays, color, sessionId },
      });
      addAudit({
        action: "create",
        entityType: "leaveType",
        entityId: leaveType.id,
        after: { name: leaveType.name, defaultDays, color },
      });
    });
    revalidatePath("/leave");
  },
);

export const updateLeaveType: (data: FormData) => Promise<ActionResult> = guardedAction(
  "leave:manage_types",
  "updateLeaveType",
  async (t, data: FormData) => {
    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0)
      throw new ActionError("invalidName", t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const color = safeColor(data.get("color")?.valueOf());

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      const duplicate = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId, NOT: { id } },
      });
      if (duplicate) throw new ActionError("leaveTypeAlreadyExists", t("leaveTypeAlreadyExists"));

      await tx.leaveType.update({
        where: { id },
        data: { name: name.trim(), description: descStr, defaultDays, color },
      });
      addAudit({
        action: "update",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name, defaultDays: existing.defaultDays, color: existing.color },
        after: { name: name.trim(), defaultDays, color },
      });
    });
    revalidatePath("/leave");
  },
);

export const deleteLeaveType: (data: FormData) => Promise<ActionResult> = guardedAction(
  "leave:manage_types",
  "deleteLeaveType",
  async (t, data: FormData) => {
    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const sessionId = await getDemoSessionId();
    const now = new Date();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      await tx.leaveType.update({ where: { id }, data: { deletedAt: now } });
      addAudit({
        action: "delete",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name },
      });
    });
    revalidatePath("/leave");
  },
);
