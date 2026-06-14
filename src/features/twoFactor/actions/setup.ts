"use server";
// 2FA setup lifecycle: begin setup, confirm/enable, and disable.
import { prisma } from "@/db";
import { auth } from "@/auth";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { safe, type ActionResult } from "@/lib/actionUtils";
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
} from "@/lib/totpCrypto";
import { type TwoFactorSetupResult } from "./_shared";

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
