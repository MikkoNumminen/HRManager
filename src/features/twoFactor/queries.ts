import { prisma } from "@/db";
import { auth } from "@/auth";

/** Check if the current user has 2FA enabled. */
export async function getTwoFactorStatus(): Promise<{
  enabled: boolean;
  hasSetup: boolean;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const tfa = await prisma.twoFactorAuth.findUnique({
    where: { userId: session.user.id },
    select: { enabled: true },
  });

  return {
    enabled: tfa?.enabled ?? false,
    hasSetup: !!tfa,
  };
}

/** Check if a user (by ID) has 2FA enabled — used during auth flow. */
export async function isUserTwoFactorEnabled(userId: string): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { enabled: true },
  });
  return tfa?.enabled ?? false;
}

/** Get the encrypted TOTP data for a user — used during auth verification. */
export async function getUserTwoFactorAuth(userId: string) {
  return prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: {
      id: true,
      encryptedSecret: true,
      enabled: true,
      recoveryCodes: true,
    },
  });
}
