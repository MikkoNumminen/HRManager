import { testPrisma, cleanDb } from "./testDb";

describe("Test DB setup", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  test("can connect and clean the database", async () => {
    await cleanDb();
    const persons = await testPrisma.person.findMany();
    expect(persons).toEqual([]);
  });
});
