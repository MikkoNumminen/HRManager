"use server";
// Mutation style: this file uses the INLINE pattern — auth/rate-limit +
// audit (captureAuditContext/deferAudit) handled directly, NOT the
// guardedAction/withAuditedTransaction wrappers. See AGENTS.md → "two
// sanctioned mutation patterns". Match this pattern when editing; new
// domain features should use the wrappers.

import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { CreateFeatureFlagSchema } from "./schemas";

export async function createFeatureFlag(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_feature_flags");
    await rateLimit("createFeatureFlag");

    const name = data.get("name")?.toString().trim() ?? "";
    const description = data.get("description")?.toString().trim() || undefined;
    const enabled = data.get("enabled") === "true";
    const scope = data.get("scope")?.toString() === "USER" ? "USER" : "GLOBAL";

    const parsed = CreateFeatureFlagSchema.safeParse({ name, description, enabled, scope });
    if (!parsed.success) {
      throw new ActionError("invalidName", t("invalidName"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const existing = await tx.featureFlag.findUnique({ where: { name: parsed.data.name } });
      if (existing) {
        throw new ActionError("invalidName", "Feature flag with this name already exists");
      }

      const flag = await tx.featureFlag.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          enabled: parsed.data.enabled,
          scope: parsed.data.scope,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "featureFlag",
        entityId: flag.id,
        before: null,
        after: { name: flag.name, enabled: flag.enabled, scope: flag.scope },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/admin/feature-flags");
  });
}

export async function toggleFeatureFlag(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_feature_flags");
    await rateLimit("toggleFeatureFlag");

    const flagId = data.get("flagId")?.toString();
    if (!flagId) throw new ActionError("invalidId", t("invalidId"));
    validateUUID(flagId, "flagId");

    const enabled = data.get("enabled") === "true";
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.findUnique({ where: { id: flagId } });
      if (!flag) throw new ActionError("invalidId", "Feature flag not found");

      await tx.featureFlag.update({
        where: { id: flagId },
        data: { enabled },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "featureFlag",
        entityId: flagId,
        before: { enabled: flag.enabled },
        after: { enabled },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/admin/feature-flags");
  });
}

export async function deleteFeatureFlag(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_feature_flags");
    await rateLimit("deleteFeatureFlag");

    const flagId = data.get("flagId")?.toString();
    if (!flagId) throw new ActionError("invalidId", t("invalidId"));
    validateUUID(flagId, "flagId");

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.findUnique({ where: { id: flagId } });
      if (!flag) throw new ActionError("invalidId", "Feature flag not found");

      await tx.featureFlag.delete({ where: { id: flagId } });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "featureFlag",
        entityId: flagId,
        before: { name: flag.name, enabled: flag.enabled, scope: flag.scope },
        after: null,
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/admin/feature-flags");
  });
}

export async function setUserFeatureFlag(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_feature_flags");
    await rateLimit("setUserFeatureFlag");

    const flagId = data.get("flagId")?.toString();
    const userId = data.get("userId")?.toString();
    if (!flagId) throw new ActionError("invalidId", t("invalidId"));
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(flagId, "flagId");
    validateUUID(userId, "userId");

    const enabled = data.get("enabled") === "true";
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.findUnique({ where: { id: flagId } });
      if (!flag) throw new ActionError("invalidId", "Feature flag not found");

      const existing = await tx.userFeatureFlag.findUnique({
        where: { userId_flagId: { userId, flagId } },
      });

      if (existing) {
        await tx.userFeatureFlag.update({
          where: { id: existing.id },
          data: { enabled },
        });
        auditEntries.push({
          ...ctx,
          action: "update",
          entityType: "featureFlag",
          entityId: existing.id,
          before: { userId, flagId, enabled: existing.enabled },
          after: { userId, flagId, enabled },
        });
      } else {
        const override = await tx.userFeatureFlag.create({
          data: { userId, flagId, enabled },
        });
        auditEntries.push({
          ...ctx,
          action: "create",
          entityType: "featureFlag",
          entityId: override.id,
          before: null,
          after: { userId, flagId, enabled },
        });
      }
    });

    deferAudit(auditEntries);
    revalidatePath("/admin/feature-flags");
  });
}

export async function removeUserFeatureFlag(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("admin:manage_feature_flags");
    await rateLimit("removeUserFeatureFlag");

    const flagId = data.get("flagId")?.toString();
    const userId = data.get("userId")?.toString();
    if (!flagId) throw new ActionError("invalidId", t("invalidId"));
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(flagId, "flagId");
    validateUUID(userId, "userId");

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userFeatureFlag.findUnique({
        where: { userId_flagId: { userId, flagId } },
      });
      if (!existing) throw new ActionError("invalidId", "User override not found");

      await tx.userFeatureFlag.delete({ where: { id: existing.id } });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "featureFlag",
        entityId: existing.id,
        before: { userId, flagId, enabled: existing.enabled },
        after: null,
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/admin/feature-flags");
  });
}
