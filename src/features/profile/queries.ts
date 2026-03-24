import { prisma } from "@/db";
import { auth } from "@/auth";
import { UserProfileSchema, UserProfile } from "@/schemas";
import { resolvePermissions } from "@/permissions";

export async function getProfile(): Promise<UserProfile | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    omit: { permissionsVersion: true },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return null;

  const overrides = user.permissions.map((up) => ({
    key: up.permission.key,
    granted: up.granted,
  }));
  const resolvedPermissions = await resolvePermissions(user.role, overrides);

  return UserProfileSchema.parse({
    ...user,
    resolvedPermissions,
  });
}
