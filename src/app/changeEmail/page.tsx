import { prisma } from "@/db";
import Link from "next/link";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import {
  changeFormStyle,
  generalButton,
  header,
  inputFieldFlex,
} from "@/tailwindStyles";
import { getPersons } from "@/utilities";

async function updateEmail(data: FormData) {
  "use server";

  const personID = data.getAll("personID") as string[];
  if (!Array.isArray(personID) || personID.length === 0) {
    throw new Error("No personID selected");
  }

  const newEmail = data.get("name")?.toString();

  if (!newEmail) {
    throw new Error("New Email is missing");
  }

  await prisma.person.updateMany({
    where: {
      id: { in: personID },
    },
    data: {
      email: newEmail,
    },
  });
}

export default async function Page() {
  const persons = await getPersons(); // TODO: cache, this is done in many pages
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Change Email</h1>
      </header>

      <form action={updateEmail} method="POST" className={changeFormStyle}>
        <ul className="pl-2 mb-2">
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>
        <div className="flex gap-1 justify-end">
          <input
            type="text"
            name="name"
            placeholder="Select and Enter New Email"
            className={inputFieldFlex}
          />
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button type="submit" className={generalButton}>
            Change
          </button>
        </div>
      </form>
    </>
  );
}
