import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/db";
import { resolvePermissions } from "@/permissions";
import { seedDemoData, cleanupStaleDemoSessions } from "@/demoSession";

// Demo login is enabled by default so the demo works out of the box.
// Set NEXT_PUBLIC_DEMO_LOGIN=false to disable the zero-credential demo provider.
// Uses NEXT_PUBLIC_ prefix so the client can conditionally show the demo login button.
const demoProvider =
  process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false"
    ? [
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

            const demoSession = await prisma.demoSession.create({
              data: { userId: user.id },
            });

            await seedDemoData(demoSession.id);

            // Clean up stale sessions in the background — don't block login
            cleanupStaleDemoSessions().catch(() => {});

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              demoSessionId: demoSession.id,
            };
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub, ...demoProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Serializable transaction prevents the TOCTOU race where two
      // simultaneous first-time sign-ins both see count === 0 and both
      // become superuser. Upsert handles concurrent sign-ins for the
      // same email without unique-constraint errors.
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.user.findUnique({
            where: { email: user.email! },
          });

          if (!existing) {
            const userCount = await tx.user.count();
            const role = userCount === 0 ? "superuser" : "user";

            await tx.user.upsert({
              where: { email: user.email! },
              update: {},
              create: {
                email: user.email!,
                name: user.name ?? null,
                image: user.image ?? null,
                role,
              },
            });
          }
        },
        { isolationLevel: "Serializable" },
      );

      return true;
    },

    async jwt({ token, trigger, user }) {
      if (!token.email) return token;

      // Persist demoSessionId from authorize() on sign-in
      if (trigger === "signIn" && user?.demoSessionId) {
        token.demoSessionId = user.demoSessionId;
      }

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
      if (token.demoSessionId) session.user.demoSessionId = token.demoSessionId as string;
      return session;
    },
  },
});
