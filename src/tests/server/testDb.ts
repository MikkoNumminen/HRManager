import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const testPrisma = new PrismaClient({ adapter });

export async function cleanDb() {
  await testPrisma.userPermission.deleteMany();
  await testPrisma.demoSession.deleteMany();
  await testPrisma.teamMember.deleteMany();
  await testPrisma.team.deleteMany();
  await testPrisma.department.deleteMany();
  await testPrisma.person.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.permission.deleteMany();
  await testPrisma.rateLimit.deleteMany();
}
