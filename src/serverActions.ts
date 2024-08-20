"use server";
import { prisma } from "@/db";

// TODO: Function to get persons with validation: ZOD
// TODO: getPerson(personId)
export async function getPersons() {
  const persons = await prisma.person.findMany();

  const validatedPersons = persons.map((person) => {
    const transformedPerson = {
      id: person.id,
      name: person.name,
      email: person.email,
      position: person.position,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };

    // Perform additional validation if needed

    return transformedPerson;
  });

  return validatedPersons;
}

export async function createPerson(data: FormData) {
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid Name");
  }
  await prisma.person.create({ data: { name, position: "-", email: "-" } });
}

export async function removePerson(data: FormData) {
  const personID = data.getAll("personID") as string[];
  if (!Array.isArray(personID) || personID.length === 0) {
    throw new Error("No personID selected");
  }
  await prisma.person.deleteMany({
    where: {
      id: { in: personID },
    },
  });

  // TODO: When person is removed check if person is a team manager
}

// Update one personID for a new position
export async function updatePosition(data: FormData) {
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }

  const newPosition = data.get("name")?.toString();
  if (!newPosition) {
    throw new Error("New position is missing");
  }

  await prisma.person.update({
    where: {
      id: personID,
    },
    data: {
      position: newPosition,
    },
  });
}

// Update one personID for a new Email
export async function updateEmail(data: FormData) {
  const personIDs = data.getAll("personID") as string[];
  if (!Array.isArray(personIDs) || personIDs.length === 0) {
    throw new Error("No personID selected");
  }

  const newEmail = data.get("name")?.toString();

  if (!newEmail) {
    throw new Error("New Email is missing");
  }

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
}
