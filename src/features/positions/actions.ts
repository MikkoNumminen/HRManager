"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_POSITION_LENGTH } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";

export async function createPositionEntry(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("position:manage");
    await rateLimit("createPositionEntry");
    const name = data.get("name")?.toString().trim();
    if (!name) throw new ActionError("invalidName", t("invalidName"));
    if (name.length > MAX_POSITION_LENGTH)
      throw new ActionError("positionTooLong", t("positionTooLong", { max: MAX_POSITION_LENGTH }));
    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existing = await tx.position.findFirst({
        where: { name, sessionId, deletedAt: null },
      });
      if (existing) throw new ActionError("positionAlreadyExists", t("positionAlreadyExists"));
      const position = await tx.position.create({ data: { name, sessionId } });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "position",
        entityId: position.id,
        before: null,
        after: { name },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/positions");
  });
}

export async function deletePositionEntry(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("position:manage");
    await rateLimit("deletePositionEntry");
    const id = data.get("id")?.toString();
    if (!id) throw new ActionError("positionNotFound", t("positionNotFound"));
    validateUUID(id, "id");
    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const position = await tx.position.findFirst({
        where: { id, sessionId, deletedAt: null },
      });
      if (!position) throw new ActionError("positionNotFound", t("positionNotFound"));
      await tx.position.update({ where: { id }, data: { deletedAt: new Date() } });
      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "position",
        entityId: id,
        before: { name: position.name },
        after: null,
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/positions");
  });
}
