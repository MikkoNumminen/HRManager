import { prisma } from "@/db";
import { PersonSchema, TeamSchema, UserSchema, Person, CombinedTeam, AppUser } from "./schemas";
import { resolvePermissions, PERMISSION_KEYS } from "@/permissions";

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

export async function getUsers(): Promise<AppUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return users.map((user) => UserSchema.parse(user));
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return null;

  const overrides = user.permissions.map((up) => ({
    key: up.permission.key,
    granted: up.granted,
  }));
  const resolvedPermissions = await resolvePermissions(user.role, overrides);

  return {
    ...UserSchema.parse(user),
    overrides,
    resolvedPermissions,
  };
}

export async function getAllPermissionKeys(): Promise<string[]> {
  return [...PERMISSION_KEYS];
}
