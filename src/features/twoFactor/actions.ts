"use server";
import { prisma } from "@/db";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit, TWO_FACTOR_VERIFY_MAX } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { revalidatePath } from "next/cache";
import {
  generateTotpSecret,
  getTotpUri,
  getTotpBase32,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  findMatchingRecoveryCode,
} from "@/lib/totpCrypto";

/**
 * Record that 2FA was verified for the current login session. This server-side
 * timestamp is the source of truth the JWT callback reads — a client cannot forge
 * it via useSession().update(). No-op if the session id is missing (defensive).
 */
async function markSessionTwoFactorVerified(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await prisma.userSession.updateMany({
    where: { id: sessionId },
    data: { twoFactorVerifiedAt: new Date() },
  });
}

export interface TwoFactorSetupResult {
  uri: string;
  secret: string;
  recoveryCodes: string[];
}

/**
 * Begin 2FA setup: generate a TOTP secret and recovery codes.
 * The secret is NOT stored yet — the user must verify a code first.
 * Returns the QR URI, base32 secret, and recovery codes.
 */
export async function beginTwoFactorSetup(): Promise<TwoFactorSetupResult> {
  const t = await getTranslations("errors");
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    throw new ActionError("notAuthenticated", t("notAuthenticated"));
  }
  await rateLimit("beginTwoFactorSetup");

  // Check if already enabled
  const existing = await prisma.twoFactorAuth.findUnique({
    where: { userId: session.user.id },
    select: { enabled: true },
  });
  if (existing?.enabled) {
    throw new ActionError("twoFactorAlreadyEnabled", t("twoFactorAlreadyEnabled"));
  }

  const totp = generateTotpSecret(session.user.email);
  const uri = getTotpUri(totp);
  const secret = getTotpBase32(totp);
  const recoveryCodes = generateRecoveryCodes();

  return { uri, secret, recoveryCodes };
}

/**
 * Confirm 2FA setup: verify the TOTP code and store the secret.
 * This is the "enable" step — the user proved they have the authenticator working.
 */
export async function confirmTwoFactorSetup(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("confirmTwoFactorSetup");

    const code = data.get("code")?.toString()?.trim();
    const secret = data.get("secret")?.toString()?.trim();
    const recoveryCodesJson = data.get("recoveryCodes")?.toString();

    if (!code || code.length !== 6) {
      throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
    }
    if (!secret) {
      throw new ActionError("invalidTotpSecret", t("invalidTotpSecret"));
    }

    // Verify the code against the provided secret
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
    }

    // Parse recovery codes. Fail loudly on a malformed payload instead of silently
    // enabling 2FA with zero recovery codes (which would leave the user no fallback).
    let recoveryCodes: string[] = [];
    if (recoveryCodesJson) {
      try {
        const parsed = JSON.parse(recoveryCodesJson);
        if (!Array.isArray(parsed)) throw new Error("recovery codes must be an array");
        recoveryCodes = parsed.filter((c): c is string => typeof c === "string");
      } catch {
        throw new ActionError("unexpectedError", t("unexpectedError"));
      }
    }

    // Hash recovery codes for storage
    const hashedCodes = recoveryCodes.map(hashRecoveryCode);

    // Encrypt the secret
    const encryptedSecret = encryptSecret(secret);

    await withAuditedTransaction(async (tx, addAudit) => {
      await tx.twoFactorAuth.upsert({
        where: { userId: session.user.id! },
        update: {
          encryptedSecret,
          enabled: true,
          recoveryCodes: hashedCodes,
        },
        create: {
          userId: session.user.id!,
          encryptedSecret,
          enabled: true,
          recoveryCodes: hashedCodes,
        },
      });

      addAudit({
        action: "update",
        entityType: "user",
        entityId: session.user.id!,
        after: { twoFactorEnabled: true },
      });
    });

    revalidatePath("/profile");
  });
}

/** Disable 2FA for the current user. Requires a valid TOTP code to confirm. */
export async function disableTwoFactor(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("disableTwoFactor");

    const code = data.get("code")?.toString()?.trim();
    if (!code || code.length !== 6) {
      throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
    }

    const tfa = await prisma.twoFactorAuth.findUnique({
      where: { userId: session.user.id },
    });
    if (!tfa?.enabled) {
      throw new ActionError("twoFactorNotEnabled", t("twoFactorNotEnabled"));
    }

    // Verify the TOTP code
    const secret = decryptSecret(tfa.encryptedSecret);
    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
    }

    await withAuditedTransaction(async (tx, addAudit) => {
      await tx.twoFactorAuth.delete({
        where: { userId: session.user.id! },
      });

      addAudit({
        action: "update",
        entityType: "user",
        entityId: session.user.id!,
        after: { twoFactorDisabled: true },
      });
    });

    revalidatePath("/profile");
  });
}

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

/**
 * Verify a TOTP code during login. Called from the 2FA verification page.
 * Sets a token flag to indicate 2FA is verified.
 */
export async function verifyTwoFactorLogin(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    const session = await auth();
    if (!session?.user?.id) throw new ActionError("notAuthenticated", t("notAuthenticated"));
    await rateLimit("verifyTwoFactorLogin", TWO_FACTOR_VERIFY_MAX);

    const code = data.get("code")?.toString()?.trim();
    const userId = session.user.id;
    const sessionId = session.user.sessionId;

    if (!code) {
      throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
    }

    const tfa = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });
    if (!tfa?.enabled) {
      // Fail loudly instead of silently returning success. A silent success here
      // let a stale "2FA required" JWT mark itself verified after an admin reset
      // (adminResetTwoFactor) deleted the 2FA row — i.e. an auth bypass.
      throw new ActionError("twoFactorNotEnabled", t("twoFactorNotEnabled"));
    }

    const secret = decryptSecret(tfa.encryptedSecret);

    // Try TOTP code first
    if (code.length === 6 && verifyTotpCode(secret, code)) {
      // Record verification server-side — the JWT reads this, not a client claim.
      await markSessionTwoFactorVerified(sessionId);
      return;
    }

    // Try recovery code (format: XXXX-XXXX or 8 chars)
    const matchIndex = findMatchingRecoveryCode(code, tfa.recoveryCodes);
    if (matchIndex >= 0) {
      // Remove the used recovery code
      const updatedCodes = [...tfa.recoveryCodes];
      updatedCodes.splice(matchIndex, 1);

      await withAuditedTransaction(async (tx, addAudit) => {
        await tx.twoFactorAuth.update({
          where: { userId },
          data: { recoveryCodes: updatedCodes },
        });
        addAudit({
          action: "update",
          entityType: "user",
          entityId: userId,
          after: { recoveryCodeUsed: true, remainingCodes: updatedCodes.length },
        });
      });

      // Record verification server-side — the JWT reads this, not a client claim.
      await markSessionTwoFactorVerified(sessionId);
      return;
    }

    throw new ActionError("invalidTotpCode", t("invalidTotpCode"));
  });
}

/** Admin action: reset a user's 2FA. Requires admin:manage_users permission. */
export const adminResetTwoFactor: (data: FormData) => Promise<ActionResult> = guardedAction(
  "admin:manage_users",
  "adminResetTwoFactor",
  async (t, data: FormData) => {
    const userId = data.get("userId")?.toString();
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(userId, "userId");

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));

    const tfa = await prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tfa) {
      // No 2FA to reset
      return;
    }

    await withAuditedTransaction(async (tx, addAudit) => {
      await tx.twoFactorAuth.delete({
        where: { userId },
      });

      addAudit({
        action: "update",
        entityType: "user",
        entityId: userId,
        after: {
          twoFactorAdminReset: true,
          targetEmail: targetUser.email,
        },
      });
    });

    revalidatePath("/admin");
  },
);
