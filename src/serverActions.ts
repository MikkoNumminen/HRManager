"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

export async function createPerson(data: FormData) {
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }

  const email = data.get("email")?.valueOf();
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new Error("Email is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }

  const existingPerson = await prisma.person.findUnique({ where: { email } });
  if (existingPerson) {
    throw new Error("A person with this email already exists");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.person.create({
      data: {
        name: name.trim(),
        position: null,
        email: email.trim(),
      },
    });
  });
  revalidatePath("/managePersons");
  revalidatePath("/");
}

export async function removePerson(data: FormData) {
  const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
  if (personIDs.length === 0) {
    throw new Error("No personID selected");
  }
  personIDs.forEach((id) => validateUUID(id, "personID"));

  await prisma.$transaction(async (prisma) => {
    await prisma.teamMember.deleteMany({
      where: {
        personId: { in: personIDs },
      },
    });

    await prisma.person.deleteMany({
      where: {
        id: { in: personIDs },
      },
    });
  });
  revalidatePath("/managePersons");
  revalidatePath("/");
}

export async function updatePosition(data: FormData) {
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }
  validateUUID(personID, "personID");

  const newPosition = data.get("name")?.toString().trim();
  if (!newPosition) {
    throw new Error("New position is missing");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.person.update({
      where: { id: personID },
      data: { position: newPosition },
    });
  });
  revalidatePath("/managePersons");
}

export async function updateEmail(data: FormData) {
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(personID, "personID");

  const newEmail = data.get("name")?.toString().trim();
  if (!newEmail) {
    throw new Error("New Email is missing");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error("Invalid email format");
  }

  const existingPerson = await prisma.person.findUnique({ where: { email: newEmail } });
  if (existingPerson) {
    throw new Error("A person with this email already exists");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.person.update({
      where: { id: personID },
      data: { email: newEmail },
    });
  });
  revalidatePath("/managePersons");
}

export async function addManager(data: FormData) {
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  const personID = data.get("personID")?.toString();

  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID provided");
  }
  teamIDs.forEach((id) => validateUUID(id, "teamID"));
  validateUUID(personID, "personID");

  await prisma.$transaction(async (prisma) => {
    await prisma.team.update({
      where: { teamId: teamIDs[0] },
      data: { teamManagerId: personID },
    });

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamIDs[0],
        },
      },
    });

    if (!existingMember) {
      await prisma.teamMember.create({
        data: {
          personId: personID,
          teamId: teamIDs[0],
        },
      });
    }
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageTeams");
}

export async function addMember(data: FormData) {
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(teamID, "teamID");
  validateUUID(personID, "personID");

  await prisma.$transaction(async (prisma) => {
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID,
        },
      },
    });

    if (existingMember) {
      throw new Error("Person is already a member of the team");
    }

    await prisma.teamMember.create({
      data: {
        personId: personID,
        teamId: teamID,
      },
    });
  });
  revalidatePath("/manageTeams");
  redirect("..");
}

export async function createTeam(data: FormData) {
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.team.create({
      data: {
        teamName: name.trim(),
        teamManagerId: null,
      },
    });
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
}

export async function removeTeam(data: FormData) {
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
  }
  teamIDs.forEach((id) => validateUUID(id, "teamID"));

  await prisma.$transaction(async (prisma) => {
    await prisma.team.deleteMany({
      where: {
        teamId: { in: teamIDs },
      },
    });
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageTeams");
}

export async function removeMember(data: FormData) {
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(teamID, "teamID");
  validateUUID(personID, "personID");

  await prisma.$transaction(async (prisma) => {
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID,
        },
      },
    });

    if (!existingMember) {
      throw new Error("Person is not a member of the team");
    }

    await prisma.teamMember.delete({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID,
        },
      },
    });

    const team = await prisma.team.findUnique({ where: { teamId: teamID } });
    if (team?.teamManagerId === personID) {
      await prisma.team.update({
        where: { teamId: teamID },
        data: { teamManagerId: null },
      });
    }
  });
  revalidatePath("/manageTeams");
  redirect("..");
}

export async function resetAll() {
  await prisma.$transaction(async (prisma) => {
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.person.deleteMany();
  });
  revalidatePath("/");
  revalidatePath("/managePersons");
  revalidatePath("/manageTeams");
}

export async function seedMockData(clearExisting: boolean = true) {
  await prisma.$transaction(async (prisma) => {
    if (clearExisting) {
      await prisma.teamMember.deleteMany();
      await prisma.team.deleteMany();
      await prisma.person.deleteMany();
    }

    // Upsert persons — find existing by email or create new
    const personSeeds = [
      { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
      { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
      { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
      { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
      { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
      { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
    ];
    const persons = [];
    for (const p of personSeeds) {
      const person = await prisma.person.upsert({
        where: { email: p.email },
        update: {},
        create: p,
      });
      persons.push(person);
    }
    const [alice, bob, carol, dave, eve, frank] = persons;

    // Upsert teams — find existing by name or create new
    const teamSeeds = [
      { teamName: "Engineering", teamManagerId: alice.id },
      { teamName: "Design", teamManagerId: carol.id },
      { teamName: "Platform", teamManagerId: null },
    ];
    const teams = [];
    for (const t of teamSeeds) {
      const team = await prisma.team.upsert({
        where: { teamName: t.teamName },
        update: {},
        create: t,
      });
      teams.push(team);
    }
    const [engineering, design, platform] = teams;

    // Add members — skip if already a member
    const memberships = [
      { personId: alice.id, teamId: engineering.teamId },
      { personId: bob.id, teamId: engineering.teamId },
      { personId: dave.id, teamId: engineering.teamId },
      { personId: eve.id, teamId: engineering.teamId },
      { personId: carol.id, teamId: design.teamId },
      { personId: frank.id, teamId: design.teamId },
      { personId: dave.id, teamId: platform.teamId },
    ];
    for (const m of memberships) {
      const existing = await prisma.teamMember.findUnique({
        where: { personId_teamId: { personId: m.personId, teamId: m.teamId } },
      });
      if (!existing) {
        await prisma.teamMember.create({ data: m });
      }
    }
  });
  revalidatePath("/");
  revalidatePath("/managePersons");
  revalidatePath("/manageTeams");
}
