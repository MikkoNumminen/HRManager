// Using Prisma transaction to ensure atomicity
"use server";
import { prisma } from "@/db";
import { redirect } from "next/navigation";

// TODO: Function to get persons with validation: ZOD
// TODO: getPerson(personId)

export async function getPersons() {
  const validatedPersons = await prisma.$transaction(async (prisma) => {
    const persons = await prisma.person.findMany();

    return persons.map((person) => {
      const transformedPerson = {
        id: person.id,
        name: person.name,
        email: person.email,
        position: person.position,
        createdAt: person.createdAt,
        updatedAt: person.updatedAt,
      };

      return transformedPerson;
    });
  });

  return validatedPersons;
}

export async function createPerson(data: FormData) {
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid Name");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.person.create({
      data: {
        name,
        position: "-",
        email: "-",
      },
    });
  });
}

export async function removePerson(data: FormData) {
  const personIDs = data.getAll("personID") as string[];
  if (!Array.isArray(personIDs) || personIDs.length === 0) {
    throw new Error("No personID selected");
  }

  await prisma.$transaction(async (prisma) => {
    // Remove person from TeamMember records
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
}

export async function updatePosition(data: FormData) {
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }

  const newPosition = data.get("name")?.toString();
  if (!newPosition) {
    throw new Error("New position is missing");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.person.update({
      where: {
        id: personID,
      },
      data: {
        position: newPosition,
      },
    });
  });
}

export async function updateEmail(data: FormData) {
  const personIDs = data.getAll("personID") as string[];
  if (!Array.isArray(personIDs) || personIDs.length === 0) {
    throw new Error("No personID selected");
  }

  const newEmail = data.get("name")?.toString();
  if (!newEmail) {
    throw new Error("New Email is missing");
  }

  await prisma.$transaction(async (prisma) => {
    for (const id of personIDs) {
      await prisma.person.update({
        where: {
          id: id,
        },
        data: {
          email: newEmail,
        },
      });
    }
  });
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
    const persons = await prisma.person.findMany();
    const selectedPerson = persons.find((person) => person.id === personID);

    if (!selectedPerson) {
      throw new Error("Selected person not found");
    }

    // Update the team manager
    await prisma.team.update({
      where: {
        teamId: teamID[0],
      },
      data: {
        teamManagerId: selectedPerson.name,
      },
    });

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID[0],
        },
      },
    });

    if (existingMember) {
      throw new Error("Person is already a member of the team");
    }

    await prisma.teamMember.create({
      data: {
        personId: personID,
        teamId: teamID[0],
      },
    });
  });

  redirect("/");
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

    // Create a new team member record
    const newMember = await prisma.teamMember.create({
      data: {
        personId: personID,
        teamId: teamID,
      },
    });

    console.log("New Team Member created:", newMember);
  });

  redirect("..");
}

export async function createTeam(data: FormData) {
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid Name");
  }

  await prisma.$transaction(async (prisma) => {
    await prisma.team.create({
      data: {
        teamName: name,
        teamManagerId: "-",
      },
    });
  });

  redirect("/");
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

  redirect("/");
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
  });

  redirect("..");
}
