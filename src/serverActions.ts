"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const personIDs = data.getAll("personID") as string[];
  if (!Array.isArray(personIDs) || personIDs.length === 0) {
    throw new Error("No personID selected");
  }

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
  const teamID = data.getAll("teamID") as string[];
  const personID = data.get("personID") as string;

  if (!Array.isArray(teamID) || teamID.length === 0) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID provided");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.team.update({
      where: { teamId: teamID[0] },
      data: { teamManagerId: personID },
    });

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID[0],
        },
      },
    });

    if (!existingMember) {
      await prisma.teamMember.create({
        data: {
          personId: personID,
          teamId: teamID[0],
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
  const teamID = data.getAll("teamID") as string[];
  if (!Array.isArray(teamID) || teamID.length === 0) {
    throw new Error("No teamID selected");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.team.deleteMany({
      where: {
        teamId: { in: teamID },
      },
    });
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageTeams");
}

export async function removeMember(data: FormData) {
  const teamID = data.get("teamID") as string;
  const personID = data.get("personID") as string;

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }

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
