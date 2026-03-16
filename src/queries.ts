import { prisma } from "@/db";
import { PersonSchema, TeamSchema } from "./schemas";

export async function getPersons() {
  const persons = await prisma.person.findMany();

  const validatedPersons = persons.map((person) => {
    const transformedPerson = {
      ...person,
      position: person.position ?? "",
      email: person.email ?? "",
    };

    try {
      return PersonSchema.parse(transformedPerson);
    } catch (error) {
      console.error(`Person validation failed: ${error}`);
      return transformedPerson;
    }
  });

  return validatedPersons;
}

export async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      relationLoadStrategy: "join",
      include: {
        manager: true,
        members: {
          include: {
            person: true,
          },
        },
      },
    });

    const validatedTeams = teams.map((team) => {
      const transformedTeam = {
        teamId: team.teamId,
        teamName: team.teamName,
        teamManagerId: team.teamManagerId ?? null,
        managerName: team.manager?.name ?? null,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        members: team.members?.map((member) => ({
          personId: member.personId,
          name: member.person.name ?? "",
          email: member.person.email ?? "",
        })) ?? [],
      };

      try {
        return TeamSchema.parse(transformedTeam);
      } catch (error) {
        console.error(`Team validation failed for ${team.teamName}:`, error);
        return transformedTeam;
      }
    });

    return validatedTeams;
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
}
