"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { MAX_NAME_LENGTH, MAX_URL_LENGTH, ImageUrlSchema } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, type ActionResult } from "./_shared";

export async function updateProfileName(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("updateProfileName");

    const name = data.get("name")?.toString();
    if (!name || name.trim().length === 0) throw new ActionError("nameRequired", t("nameRequired"));
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new ActionError("userNotFound", t("userNotFound"));

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
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("updateProfileImage");

    const image = data.get("image")?.toString() ?? "";
    const trimmed = image.trim();

    if (trimmed.length > 0) {
      const urlResult = ImageUrlSchema.safeParse(trimmed);
      if (!urlResult.success) {
        const msg = urlResult.error.issues[0]?.message;
        if (msg === "invalidUrlProtocol")
          throw new ActionError("invalidUrlProtocol", t("invalidUrlProtocol"));
        if (msg === "invalidUrlFormat")
          throw new ActionError("invalidUrlFormat", t("invalidUrlFormat"));
        throw new ActionError("urlTooLong", t("urlTooLong", { max: MAX_URL_LENGTH }));
      }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) throw new ActionError("userNotFound", t("userNotFound"));

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
