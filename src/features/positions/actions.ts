"use server";
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_POSITION_LENGTH } from "@/schemas/shared";
import { validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const createPositionEntry: (data: FormData) => Promise<ActionResult> = guardedAction(
  "position:manage",
  "createPositionEntry",
  async (t, data: FormData) => {
    const name = data.get("name")?.toString().trim();
    if (!name) throw new ActionError("invalidName", t("invalidName"));
    if (name.length > MAX_POSITION_LENGTH)
      throw new ActionError("positionTooLong", t("positionTooLong", { max: MAX_POSITION_LENGTH }));
    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const existing = await tx.position.findFirst({
        where: { name, sessionId, deletedAt: null },
      });
      if (existing) throw new ActionError("positionAlreadyExists", t("positionAlreadyExists"));
      const position = await tx.position.create({ data: { name, sessionId } });
      addAudit({
        action: "create",
        entityType: "position",
        entityId: position.id,
        before: null,
        after: { name },
      });
    });
    revalidatePath("/positions");
  },
);

export const deletePositionEntry: (data: FormData) => Promise<ActionResult> = guardedAction(
  "position:manage",
  "deletePositionEntry",
  async (t, data: FormData) => {
    const id = data.get("id")?.toString();
    if (!id) throw new ActionError("positionNotFound", t("positionNotFound"));
    validateUUID(id, "id");
    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const position = await tx.position.findFirst({
        where: { id, sessionId, deletedAt: null },
      });
      if (!position) throw new ActionError("positionNotFound", t("positionNotFound"));
      await tx.position.update({ where: { id }, data: { deletedAt: new Date() } });
      addAudit({
        action: "delete",
        entityType: "position",
        entityId: id,
        before: { name: position.name },
        after: null,
      });
    });
    revalidatePath("/positions");
  },
);
