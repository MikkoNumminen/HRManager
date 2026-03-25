import { testPrisma, cleanDb } from "./testDb";

describe("Test DB setup", () => {
  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  // Make sure the test database is alive and we can wipe it clean.
  // If this fails, nothing else in the server tests will work either.
  test("can connect and clean the database", async () => {
    await cleanDb();
    const persons = await testPrisma.person.findMany();
    expect(persons).toEqual([]);
  }, 30_000);
});
