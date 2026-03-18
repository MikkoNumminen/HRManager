import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/db";
import { resolvePermissions } from "@/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existing) {
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? "superuser" : "user";

        await prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email: user.email!,
              name: user.name ?? null,
              image: user.image ?? null,
              role,
            },
          });
        });
      }

      return true;
    },

    async jwt({ token, trigger }) {
      if (!token.email) return token;

      if (trigger === "signIn" || !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          const overrides = dbUser.permissions.map((up) => ({
            key: up.permission.key,
            granted: up.granted,
          }));
          token.permissions = await resolvePermissions(dbUser.role, overrides);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      if (token.role) session.user.role = token.role as string;
      if (token.permissions)
        session.user.permissions = token.permissions as Record<string, boolean>;
      return session;
    },
  },
});
