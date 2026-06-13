"use server";
// Mock-data seeding: populates persons, teams, departments, leave data, and (in
// non-prod, non-demo sessions) sample users with permission overrides.
import { prisma } from "@/db";
import { LeaveRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { seedPermissions } from "@/permissions";
import { deferAuditLog } from "@/auditLog";
import { getDemoSessionId } from "@/demoSession";
import { type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { invalidateDashboardCache } from "@/lib/cacheInvalidation";
import {
  PERSON_SEEDS,
  TEAM_SEEDS,
  MEMBERSHIP_SEEDS,
  DEPARTMENT_SEEDS,
  LEAVE_TYPE_SEEDS,
} from "@/seeds";

export const seedMockData: (clearExisting?: boolean) => Promise<ActionResult> = guardedAction(
  "data:seed",
  "seedMockData",
  async (_t, clearExisting: boolean = true) => {
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
  },
);
