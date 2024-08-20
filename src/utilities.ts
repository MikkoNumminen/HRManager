import { prisma } from "@/db";
import { PersonSchema, TeamSchema } from "@/zodStyles";

// Function to get persons with validation
export async function getPersons() {
  const persons = await prisma.person.findMany();

  const validatedPersons = persons.map((person) => {
    const transformedPerson = {
      ...person,
      position: person.position ?? "",
      email: person.email ?? "",
    };

    try {
      PersonSchema.parse(transformedPerson);
    } catch (error) {
      console.error(`Person validation failed: ${error}`);
    }

    return transformedPerson;
  });

  return validatedPersons;
}

// Function to get teams with validation
export async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
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
        teamManagerId: team.teamManagerId ?? "",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        members: team.members.map((member) => ({
          name: member.person.name ?? "",
          email: member.person.email ?? "",
        })),
      };

      try {
        TeamSchema.parse(transformedTeam);
      } catch (error) {
        console.error(`Team validation failed: ${error}`);
      }

      return transformedTeam;
    });

    return validatedTeams;
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}
