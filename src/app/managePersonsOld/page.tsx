import { prisma } from "@/db";
import { redirect } from "next/navigation";
import {
  collectedPageForm,
  inputField,
  inputFieldFlex,
} from "@/tailwindStyles";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import { Box, Link, Typography, Button } from "@mui/material";
import { smallButtonStyles } from "@/muiStyles";
import { getPersons } from "@/utilities";

async function createPerson(data: FormData) {
  "use server";

  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid Name");
  }
  await prisma.person.create({ data: { name, position: "-" } });
  redirect("/");
}

async function removePerson(data: FormData) {
  "use server";

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

  redirect("/");
}

async function updatePersons(data: FormData) {
  "use server";

  const personID = data.getAll("personID") as string[];
  if (!Array.isArray(personID) || personID.length === 0) {
    throw new Error("No personID selected");
  }

  // TODO: toString? Korjaa ZODilla
  const newPosition = data.get("name")?.toString();

  if (!newPosition) {
    throw new Error("New position is missing");
  }

  await prisma.person.updateMany({
    where: {
      id: { in: personID },
    },
    data: {
      position: newPosition,
    },
  });

  redirect("/");
}

async function updateEmail(data: FormData) {
  "use server";

  const personIDs = data.getAll("personID") as string[];
  if (!Array.isArray(personIDs) || personIDs.length === 0) {
    throw new Error("No personID selected");
  }

  // TODO: toString? Korjaa ZODilla
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

  redirect("/");
}

export default async function Page() {
  const persons = await getPersons(); // TODO: cache

  return (
    <>
      <Typography variant="h4">Manage Persons</Typography>
      {/*"TODO: Zod validations here"*/}
      <form action={createPerson} className={collectedPageForm}>
        <Typography variant="h5">Add Person</Typography>
        <input
          type="text"
          name="name"
          placeholder="Enter Name"
          className={inputField}
        ></input>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <Link href=".." sx={smallButtonStyles}>
            Cancel
          </Link>
          <Button type="submit" sx={smallButtonStyles}>
            Create
          </Button>
        </Box>
      </form>

      <form action={removePerson} className={collectedPageForm}>
        <Typography variant="h5">Remove Person</Typography>
        <ul className="pl-2 mb-2">
          {persons.map((p) => (
            <RemovePersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>

        <Box display="flex" gap={1} justifyContent="flex-end">
          <Link href=".." sx={smallButtonStyles}>
            Cancel
          </Link>

          <Button type="submit" sx={smallButtonStyles}>
            Remove
          </Button>
        </Box>
      </form>

      <form action={updatePersons} className={collectedPageForm}>
        <Typography variant="h5">Change Position</Typography>
        <ul className="pl-2 mb-2 ">
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <input
            type="text"
            name="name"
            placeholder="Select and Enter New Position"
            className={inputFieldFlex}
          ></input>
          <Link href=".." sx={smallButtonStyles}>
            Cancel
          </Link>
          <Button type="submit" sx={smallButtonStyles}>
            Change
          </Button>
        </Box>
      </form>

      <form action={updateEmail} className={collectedPageForm}>
        <Typography variant="h5">Change Email</Typography>
        <ul className="pl-2 mb-2">
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <input
            type="text"
            name="name"
            placeholder="Select and Enter New Email"
            className={inputFieldFlex}
          ></input>
          <Link href=".." sx={smallButtonStyles}>
            Cancel
          </Link>
          <Button type="submit" sx={smallButtonStyles}>
            Change
          </Button>
        </Box>
      </form>
    </>
  );
}
