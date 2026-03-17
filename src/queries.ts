import { prisma } from "@/db";
import { PersonSchema, TeamSchema, Person, CombinedTeam } from "./schemas";

export async function getPersons(): Promise<Person[]> {
  const persons = await prisma.person.findMany();

  return persons.map((person) => PersonSchema.parse(person));
}

export async function getTeams(): Promise<CombinedTeam[]> {
  const teams = await prisma.team.findMany({
    include: {
      manager: true,
      members: {
        include: {
          person: true,
        },
      },
    },
  });

  return teams.map((team) =>
    TeamSchema.parse({
      teamId: team.teamId,
      teamName: team.teamName,
      teamManagerId: team.teamManagerId ?? null,
      managerName: team.manager?.name ?? null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members:
        team.members?.map((member) => ({
          personId: member.personId,
          name: member.person.name,
          email: member.person.email ?? null,
        })) ?? [],
    }),
  );
}
