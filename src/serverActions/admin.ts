"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission, seedPermissions } from "@/permissions";
import { auth } from "@/auth";
import { captureAuditContext, deferAudit, deferAuditLog, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { DEMO_EMAIL } from "@/constants";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "./_shared";

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

      // Upsert persons — find existing by email or create new
      const personSeeds = [
        { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
        { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
        { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
        { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
        { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
        { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
      ];
      const persons = [];
      for (const p of personSeeds) {
        const existing = await prisma.person.findFirst({
          where: { email: p.email, deletedAt: null, sessionId },
        });
        const person = existing ?? (await prisma.person.create({ data: { ...p, sessionId } }));
        persons.push(person);
      }
      const [alice, bob, carol, dave, eve, frank] = persons;

      // Upsert teams — find existing by name or create new
      const teamSeeds = [
        { teamName: "Engineering", teamManagerId: alice.id },
        { teamName: "Design", teamManagerId: carol.id },
        { teamName: "Platform", teamManagerId: dave.id },
      ];
      const teams = [];
      for (const t of teamSeeds) {
        const existing = await prisma.team.findFirst({
          where: { teamName: t.teamName, deletedAt: null, sessionId },
        });
        const team = existing ?? (await prisma.team.create({ data: { ...t, sessionId } }));
        teams.push(team);
      }
      const [engineering, design, platform] = teams;

      // Add members — skip if already a member
      const memberships = [
        { personId: alice.id, teamId: engineering.teamId },
        { personId: bob.id, teamId: engineering.teamId },
        { personId: eve.id, teamId: engineering.teamId },
        { personId: carol.id, teamId: design.teamId },
        { personId: frank.id, teamId: design.teamId },
        { personId: dave.id, teamId: platform.teamId },
        { personId: bob.id, teamId: platform.teamId },
      ];
      for (const m of memberships) {
        const existing = await prisma.teamMember.findFirst({
          where: { personId: m.personId, teamId: m.teamId, deletedAt: null },
        });
        if (!existing) {
          await prisma.teamMember.create({ data: { ...m, sessionId } });
        }
      }

      // Upsert departments and assign teams
      const departmentSeeds = [
        {
          name: "Engineering",
          description: "Software development and infrastructure",
          headId: alice.id,
          teamNames: ["Engineering", "Platform"],
        },
        {
          name: "Product & Design",
          description: "Product management, UX, and design",
          headId: frank.id,
          teamNames: ["Design"],
        },
      ];
      for (const d of departmentSeeds) {
        const existingDept = await prisma.department.findFirst({
          where: { name: d.name, deletedAt: null, sessionId },
        });
        const dept =
          existingDept ??
          (await prisma.department.create({
            data: { name: d.name, description: d.description, headId: d.headId, sessionId },
          }));
        for (const teamName of d.teamNames) {
          await prisma.team.updateMany({
            where: { teamName, departmentId: null, sessionId },
            data: { departmentId: dept.id },
          });
        }
      }

      // Seed leave types
      const leaveTypeSeeds = [
        {
          name: "Annual Leave",
          description: "Paid annual vacation days",
          defaultDays: 25,
          color: "#4caf50",
        },
        { name: "Sick Leave", description: "Paid sick days", defaultDays: 10, color: "#f44336" },
        {
          name: "Parental Leave",
          description: "Maternity or paternity leave",
          defaultDays: 90,
          color: "#9c27b0",
        },
        {
          name: "Unpaid Leave",
          description: "Leave without pay",
          defaultDays: 0,
          color: "#757575",
        },
      ];
      const leaveTypes = [];
      for (const lt of leaveTypeSeeds) {
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

      // Alice: approved annual leave next week (5 days)
      await prisma.leaveRequest.create({
        data: {
          personId: alice.id,
          leaveTypeId: annualLeave.id,
          startDate: nextWeek,
          endDate: new Date(nextWeek.getTime() + 4 * 86400000),
          days: 5,
          note: "Family vacation",
          status: "approved",
          reviewerId: frank.id,
          reviewedAt: today,
          sessionId,
        },
      });

      // Bob: pending sick leave
      await prisma.leaveRequest.create({
        data: {
          personId: bob.id,
          leaveTypeId: sickLeave.id,
          startDate: nextNextWeek,
          endDate: new Date(nextNextWeek.getTime() + 1 * 86400000),
          days: 2,
          note: "Medical appointment",
          status: "pending",
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

    // Seed mock users only for real (non-demo) sessions — the User table has no
    // sessionId column, so mock users would leak into the global table and be visible
    // across sessions. Demo sessions only see demo@hrmanager.app via getUsers() anyway.
    if (!sessionId) {
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
    revalidatePath("/managePersons");
    revalidatePath("/manageTeams");
    revalidatePath("/manageDepartments");
    revalidatePath("/admin");
  });
}

export async function initializePermissions() {
  await requirePermission("admin:manage_users");
  await rateLimit("initializePermissions");
  await seedPermissions();
}

export async function updateUserRole(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
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
    if (demoSessionId && targetUser.email !== "demo@hrmanager.app") {
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
