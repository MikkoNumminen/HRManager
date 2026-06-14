"use server";
// Recovery-code management: regenerate the user's 2FA recovery codes.
import { prisma } from "@/db";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { type ActionResult } from "@/lib/actionUtils";
import {
  decryptSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/totpCrypto";

/** Regenerate recovery codes for the current user. Requires a valid TOTP code. */
export async function regenerateRecoveryCodes(
  data: FormData,
): Promise<{ recoveryCodes: string[] } | ActionResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  if (!session?.user?.id) {
    return { error: t("notAuthenticated"), code: "notAuthenticated" as const };
  }

  try {
    await rateLimit("regenerateRecoveryCodes");

    const code = data.get("code")?.toString()?.trim();
    if (!code || code.length !== 6) {
      return { error: t("invalidTotpCode"), code: "invalidTotpCode" as const };
    }

    const tfa = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });
    if (!tfa?.enabled) {
      return { error: t("twoFactorNotEnabled"), code: "twoFactorNotEnabled" as const };
    }

    const secret = decryptSecret(tfa.encryptedSecret);
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return { error: t("invalidTotpCode"), code: "invalidTotpCode" as const };
    }

    const newCodes = generateRecoveryCodes();
    const hashedCodes = newCodes.map(hashRecoveryCode);

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      await tx.twoFactorAuth.update({
        where: { userId: session.user.id! },
        data: { recoveryCodes: hashedCodes },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: session.user.id!,
        after: { recoveryCodesRegenerated: true },
      });
    });

    deferAudit(auditEntries);
    return { recoveryCodes: newCodes };
  } catch (error) {
    if (error instanceof ActionError) {
      return { error: error.message, code: error.code };
    }
    return { error: t("unexpectedError"), code: "unexpectedError" as const };
  }
}
