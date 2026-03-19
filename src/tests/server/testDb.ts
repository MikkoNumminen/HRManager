import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient({
  datasources: { db: { url: "file:./prisma/test.db" } },
});

export async function cleanDb() {
  await testPrisma.auditLog.deleteMany();
  await testPrisma.userPermission.deleteMany();
  await testPrisma.teamMember.deleteMany();
  await testPrisma.team.deleteMany();
  await testPrisma.person.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.permission.deleteMany();
}
