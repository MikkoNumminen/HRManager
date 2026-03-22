import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/db";
import { resolvePermissions } from "@/permissions";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    GitHub,
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        const demoEmail = "demo@hrmanager.app";
        let user = await prisma.user.findUnique({ where: { email: demoEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: demoEmail,
              name: "Demo User",
              role: "superuser",
            },
          });
        } else if (user.role !== "superuser") {
          user = await prisma.user.update({
            where: { email: demoEmail },
            data: { role: "superuser" },
          });
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
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

      const needsFullRefresh =
        trigger === "signIn" || !token.role || typeof token.permissionsVersion !== "number";

      if (needsFullRefresh) {
        // Full fetch: signIn, first load, or missing version
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        });

        if (!dbUser) {
          delete token.userId;
          delete token.role;
          delete token.permissions;
          delete token.permissionsVersion;
          return token;
        }

        token.userId = dbUser.id;
        token.role = dbUser.role;
        token.permissionsVersion = dbUser.permissionsVersion;
        const overrides = dbUser.permissions.map((up) => ({
          key: up.permission.key,
          granted: up.granted,
        }));
        token.permissions = await resolvePermissions(dbUser.role, overrides);
      } else {
        // Lightweight check: only fetch version to detect permission changes
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, permissionsVersion: true },
        });

        if (!dbUser) {
          delete token.userId;
          delete token.role;
          delete token.permissions;
          delete token.permissionsVersion;
          return token;
        }

        if (dbUser.permissionsVersion !== token.permissionsVersion || dbUser.role !== token.role) {
          // Permissions or role changed — full refresh
          const fullUser = await prisma.user.findUnique({
            where: { id: dbUser.id },
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          });

          if (fullUser) {
            token.role = fullUser.role;
            token.permissionsVersion = fullUser.permissionsVersion;
            const overrides = fullUser.permissions.map((up) => ({
              key: up.permission.key,
              granted: up.granted,
            }));
            token.permissions = await resolvePermissions(fullUser.role, overrides);
          }
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
