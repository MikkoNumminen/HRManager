import { prisma } from "@/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import { changeFormStyle, generalButton, header } from "@/tailwindStyles";
import { getPersons } from "@/utilities";

// Server action, experimental
async function updatePersons(data: FormData) {
  "use server";

  const personID = data.getAll("personID") as string[];
  if (!Array.isArray(personID) || personID.length === 0) {
    throw new Error("No personID selected");
  }

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

export default async function Page() {
  const persons = await getPersons(); // TODO: cache, this is done in many pages
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Change Position</h1>
      </header>

      <form action={updatePersons} method="POST" className={changeFormStyle}>
        <ul className="pl-2 mb-2 flex-grow">
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>
        <div className="flex gap-1 justify-end">
          <input
            type="text"
            name="name"
            placeholder="Select and Enter New Position"
            className="flex-grow border border-slate-300 bg-transparent rounded px-2 py-1 outline-none focus-within:border-slate-100"
          ></input>
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
