import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

export async function cleanDb() {
  await testPrisma.auditLog.deleteMany();
  await testPrisma.userPermission.deleteMany();
  await testPrisma.teamMember.deleteMany();
  await testPrisma.team.deleteMany();
  await testPrisma.department.deleteMany();
  await testPrisma.person.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.permission.deleteMany();
  await testPrisma.rateLimit.deleteMany();
}
