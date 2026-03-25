"use server";
import { prisma } from "@/db";
import { LeaveRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePermission, seedPermissions } from "@/permissions";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, deferAuditLog, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { DEMO_EMAIL } from "@/constants";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";
import { requireAdminIp } from "@/lib/ipAllowlist";
import {
  PERSON_SEEDS,
  TEAM_SEEDS,
  MEMBERSHIP_SEEDS,
  DEPARTMENT_SEEDS,
  LEAVE_TYPE_SEEDS,
} from "@/seeds";

export async function resetAll(): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("data:reset");
    await rateLimit("resetAll");
    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const sessionWhere = { sessionId };
      const counts = {
        teamMembers: await tx.teamMember.count({ where: sessionWhere }),
        teams: await tx.team.count({ where: sessionWhere }),
        departments: await tx.department.count({ where: sessionWhere }),
        persons: await tx.person.count({ where: sessionWhere }),
      };
      await tx.leaveRequest.deleteMany({ where: sessionWhere });
      await tx.leaveBalance.deleteMany({ where: sessionWhere });
      await tx.leaveType.deleteMany({ where: sessionWhere });
      await tx.teamMember.deleteMany({ where: sessionWhere });
      await tx.team.deleteMany({ where: sessionWhere });
      await tx.department.deleteMany({ where: sessionWhere });
      await tx.person.deleteMany({ where: sessionWhere });
      auditEntries.push({
        ...ctx,
        action: "reset",
        entityType: "person",
        before: counts,
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/");
    invalidateDashboardCache();
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/leave");
  });
}

export async function seedMockData(clearExisting: boolean = true): Promise<ActionResult> {
  return safe(async () => {
    await requirePermission("data:seed");
    await rateLimit("seedMockData");
    const sessionId = await getDemoSessionId();
    const sessionWhere = { sessionId };
    await prisma.$transaction(async (prisma) => {
      if (clearExisting) {
        await prisma.leaveRequest.deleteMany({ where: sessionWhere });
        await prisma.leaveBalance.deleteMany({ where: sessionWhere });
        await prisma.leaveType.deleteMany({ where: sessionWhere });
        await prisma.teamMember.deleteMany({ where: sessionWhere });
        await prisma.team.deleteMany({ where: sessionWhere });
        await prisma.department.deleteMany({ where: sessionWhere });
        await prisma.person.deleteMany({ where: sessionWhere });
      }

      // Batch upsert persons — find all existing by email, create only missing ones
      const personEmails = PERSON_SEEDS.map((p) => p.email);
      const existingPersons = await prisma.person.findMany({
        where: { email: { in: personEmails }, deletedAt: null, sessionId },
      });
      const existingPersonEmails = new Set(existingPersons.map((p) => p.email));
      const missingPersonSeeds = PERSON_SEEDS.filter((p) => !existingPersonEmails.has(p.email));
      if (missingPersonSeeds.length > 0) {
        await prisma.person.createMany({
          data: missingPersonSeeds.map((p) => ({ ...p, sessionId })),
        });
      }
      const persons = await prisma.person.findMany({
        where: { email: { in: personEmails }, deletedAt: null, sessionId },
      });
      const personByEmail = new Map(persons.map((p) => [p.email, p]));
      const resolvedPersons = PERSON_SEEDS.map((p) => personByEmail.get(p.email)!);

      // Batch upsert teams — find all existing by name, create only missing ones
      const teamSeedsResolved = TEAM_SEEDS.map((t) => ({
        teamName: t.teamName,
        teamManagerId: resolvedPersons[t.managerIndex].id,
      }));
      const teamNames = teamSeedsResolved.map((t) => t.teamName);
      const existingTeams = await prisma.team.findMany({
        where: { teamName: { in: teamNames }, deletedAt: null, sessionId },
      });
      const existingTeamNames = new Set(existingTeams.map((t) => t.teamName));
      const missingTeamSeeds = teamSeedsResolved.filter((t) => !existingTeamNames.has(t.teamName));
      if (missingTeamSeeds.length > 0) {
        await prisma.team.createMany({
          data: missingTeamSeeds.map((t) => ({ ...t, sessionId })),
        });
      }
      const teams = await prisma.team.findMany({
        where: { teamName: { in: teamNames }, deletedAt: null, sessionId },
      });
      const teamByName = new Map(teams.map((t) => [t.teamName, t]));
      const resolvedTeams = TEAM_SEEDS.map((t) => teamByName.get(t.teamName)!);

      // Add members — skip if already a member (batch check then batch insert)
      const memberships = MEMBERSHIP_SEEDS.map((m) => ({
        personId: resolvedPersons[m.personIndex].id,
        teamId: resolvedTeams[m.teamIndex].teamId,
      }));
      const existingMembers = await prisma.teamMember.findMany({
        where: {
          OR: memberships.map((m) => ({ personId: m.personId, teamId: m.teamId })),
          deletedAt: null,
        },
      });
      const existingMemberKeys = new Set(existingMembers.map((m) => `${m.personId}:${m.teamId}`));
      const missingMemberships = memberships.filter(
        (m) => !existingMemberKeys.has(`${m.personId}:${m.teamId}`),
      );
      if (missingMemberships.length > 0) {
        await prisma.teamMember.createMany({
          data: missingMemberships.map((m) => ({ ...m, sessionId })),
        });
      }

      // Upsert departments and assign teams
      for (const d of DEPARTMENT_SEEDS) {
        const existingDept = await prisma.department.findFirst({
          where: { name: d.name, deletedAt: null, sessionId },
        });
        const dept =
          existingDept ??
          (await prisma.department.create({
            data: {
              name: d.name,
              description: d.description,
              headId: resolvedPersons[d.headIndex].id,
              sessionId,
            },
          }));
        for (const teamName of d.teamNames) {
          await prisma.team.updateMany({
            where: { teamName, departmentId: null, sessionId },
            data: { departmentId: dept.id },
          });
        }
      }

      // Seed leave types
      const leaveTypes = [];
      for (const lt of LEAVE_TYPE_SEEDS) {
        const existing = await prisma.leaveType.findFirst({
          where: { name: lt.name, deletedAt: null, sessionId },
        });
        const leaveType =
          existing ?? (await prisma.leaveType.create({ data: { ...lt, sessionId } }));
        leaveTypes.push(leaveType);
      }
      const [annualLeave, sickLeave] = leaveTypes;

      // Seed leave balances for current year
      const currentYear = new Date().getFullYear();
      for (const person of persons) {
        for (const lt of leaveTypes) {
          const existing = await prisma.leaveBalance.findUnique({
            where: {
              personId_leaveTypeId_year: {
                personId: person.id,
                leaveTypeId: lt.id,
                year: currentYear,
              },
            },
          });
          if (!existing) {
            await prisma.leaveBalance.create({
              data: {
                personId: person.id,
                leaveTypeId: lt.id,
                year: currentYear,
                allocated: lt.defaultDays,
                used: 0,
                sessionId,
              },
            });
          }
        }
      }

      // Seed a few sample leave requests
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 86400000);
      const nextNextWeek = new Date(today.getTime() + 14 * 86400000);

      // Alice (index 0): approved annual leave next week (5 days)
      const alice = resolvedPersons[0];
      const bob = resolvedPersons[1];
      const frank = resolvedPersons[5];
      await prisma.leaveRequest.create({
        data: {
          personId: alice.id,
          leaveTypeId: annualLeave.id,
          startDate: nextWeek,
          endDate: new Date(nextWeek.getTime() + 4 * 86400000),
          days: 5,
          note: "Family vacation",
          status: LeaveRequestStatus.APPROVED,
          reviewerId: frank.id,
          reviewedAt: today,
          sessionId,
        },
      });

      // Bob (index 1): pending sick leave
      await prisma.leaveRequest.create({
        data: {
          personId: bob.id,
          leaveTypeId: sickLeave.id,
          startDate: nextNextWeek,
          endDate: new Date(nextNextWeek.getTime() + 1 * 86400000),
          days: 2,
          note: "Medical appointment",
          status: LeaveRequestStatus.PENDING,
          sessionId,
        },
      });

      // Update Alice's annual leave balance to reflect approved leave
      await prisma.leaveBalance.update({
        where: {
          personId_leaveTypeId_year: {
            personId: alice.id,
            leaveTypeId: annualLeave.id,
            year: currentYear,
          },
        },
        data: { used: 5 },
      });
    });

    // Seed mock users only in non-production, non-demo sessions — the User table
    // has no sessionId column, so mock users would leak into the global table.
    // In production, skip entirely to prevent test accounts from being created.
    const isNonProd = process.env.NODE_ENV !== "production";
    if (!sessionId && isNonProd) {
      const mockUserSeeds = [
        { email: "admin@example.com", name: "Jane Admin", role: "administrator" },
        { email: "user1@example.com", name: "John User", role: "user" },
        { email: "user2@example.com", name: "Sarah User", role: "user" },
        { email: "guest@example.com", name: "Demo Guest", role: "guest" },
      ];

      if (clearExisting) {
        await prisma.$transaction(async (tx) => {
          await tx.userPermission.deleteMany({
            where: { user: { email: { endsWith: "@example.com" } } },
          });
          await tx.user.deleteMany({
            where: { email: { endsWith: "@example.com" } },
          });
        });
      }

      await seedPermissions();

      await prisma.$transaction(async (tx) => {
        for (const u of mockUserSeeds) {
          const user = await tx.user.upsert({
            where: { email: u.email },
            update: {},
            create: u,
          });

          // Give admin@example.com a custom override: grant data:seed
          if (u.email === "admin@example.com") {
            const seedPerm = await tx.permission.findUnique({ where: { key: "data:seed" } });
            if (seedPerm) {
              await tx.userPermission.upsert({
                where: { userId_permissionId: { userId: user.id, permissionId: seedPerm.id } },
                update: { granted: true },
                create: { userId: user.id, permissionId: seedPerm.id, granted: true },
              });
            }
          }

          // Give user1@example.com a custom override: grant person:create
          if (u.email === "user1@example.com") {
            const createPerm = await tx.permission.findUnique({
              where: { key: "person:create" },
            });
            if (createPerm) {
              await tx.userPermission.upsert({
                where: { userId_permissionId: { userId: user.id, permissionId: createPerm.id } },
                update: { granted: true },
                create: { userId: user.id, permissionId: createPerm.id, granted: true },
              });
            }
          }
        }
      });
    } else {
      // Demo sessions still need permissions seeded for the permission catalog
      await seedPermissions();
    }

    await deferAuditLog({
      action: "seed",
      entityType: "person",
      after: { clearExisting },
    });

    revalidatePath("/");
    invalidateDashboardCache();
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/admin");
  });
}

export async function initializePermissions() {
  await requireAdminIp();
  await requirePermission("admin:manage_users");
  await rateLimit("initializePermissions");
  await seedPermissions();
}

export async function updateUserRole(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:manage_users");
    await rateLimit("updateUserRole");

    const userId = data.get("userId")?.toString();
    const newRole = data.get("role")?.toString();

    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    if (!newRole) throw new ActionError("noRoleProvided", t("noRoleProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const validRoles = demoSessionId
      ? ["superuser", "administrator", "user", "guest"]
      : ["administrator", "user", "guest"];
    if (!validRoles.includes(newRole)) {
      throw new ActionError("invalidRole", t("invalidRole"));
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new ActionError("cannotChangeSuperuserRole", t("cannotChangeSuperuserRole"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole, permissionsVersion: { increment: 1 } },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "user",
        entityId: userId,
        before: { role: targetUser.role, targetEmail: targetUser.email },
        after: { role: newRole, targetEmail: targetUser.email },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function updateUserPermission(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:assign_permissions");
    await rateLimit("updateUserPermission");

    const userId = data.get("userId")?.toString();
    const permissionKey = data.get("permissionKey")?.toString();
    const action = data.get("action")?.toString();

    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    if (!permissionKey) throw new ActionError("noPermissionProvided", t("noPermissionProvided"));
    if (!action) throw new ActionError("noActionProvided", t("noActionProvided"));
    validateUUID(userId, "userId");

    const demoSessionId = await getDemoSessionId();
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (!demoSessionId && targetUser.role === "superuser") {
      throw new ActionError(
        "cannotModifySuperuserPermissions",
        t("cannotModifySuperuserPermissions"),
      );
    }

    const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
    if (!permission) throw new ActionError("permissionNotFound", t("permissionNotFound"));

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      if (action === "reset") {
        await tx.userPermission.deleteMany({
          where: { userId, permissionId: permission.id },
        });
        auditEntries.push({
          ...ctx,
          action: "delete",
          entityType: "userPermission",
          entityId: userId,
          before: { permissionKey, action: "reset", targetEmail: targetUser.email },
        });
      } else {
        const granted = action === "grant";
        await tx.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: permission.id,
            },
          },
          update: { granted },
          create: { userId, permissionId: permission.id, granted },
        });
        auditEntries.push({
          ...ctx,
          action: "update",
          entityType: "userPermission",
          entityId: userId,
          after: { permissionKey, granted, targetEmail: targetUser.email },
        });
      }
      // Bump version so JWT callback detects the change
      await tx.user.update({
        where: { id: userId },
        data: { permissionsVersion: { increment: 1 } },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}

export async function kickOutUser(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requireAdminIp();
    await requirePermission("admin:manage_users");
    await rateLimit("kickOutUser");

    const userId = data.get("userId")?.toString();
    if (!userId) throw new ActionError("noUserProvided", t("noUserProvided"));
    validateUUID(userId, "userId");

    const session = await auth();
    const demoSessionId = await getDemoSessionId();

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ActionError("userNotFound", t("userNotFound"));
    if (targetUser.role === "superuser") {
      throw new ActionError("cannotKickSuperuser", t("cannotKickSuperuser"));
    }
    // Demo sessions can only kick the demo user — prevent deleting real OAuth users
    if (demoSessionId && targetUser.email !== DEMO_EMAIL) {
      throw new ActionError("demoCannotManageUsers", t("demoCannotManageUsers"));
    }
    // Prevent self-kick — deleting your own user orphans the session
    if (session?.user?.id === userId) {
      throw new ActionError("cannotKickYourself", t("cannotKickYourself"));
    }

    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      auditEntries.push({
        ...ctx,
        action: "kickout",
        entityType: "user",
        entityId: userId,
        before: { email: targetUser.email, name: targetUser.name, role: targetUser.role },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/admin");
  });
}
