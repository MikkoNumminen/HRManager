"use server";
// Login-time 2FA verification: accept a TOTP or recovery code and mark the session verified.
import { prisma } from "@/db";
import { auth } from "@/auth";
import { rateLimit, TWO_FACTOR_VERIFY_MAX } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getTranslations } from "next-intl/server";
import { safe, type ActionResult } from "@/lib/actionUtils";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { decryptSecret, verifyTotpCode, findMatchingRecoveryCode } from "@/lib/totpCrypto";

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
