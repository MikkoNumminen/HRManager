import { prisma } from "@/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";
import { generalButton, header } from "@/tailwindStyles";
import { getPersons } from "@/utilities";

// Server action, experimental
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

export default async function Page() {
  const persons = await getPersons(); // TODO: cache
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Remove person</h1>
      </header>

      <form
        action={removePerson}
        method="POST"
        className="flex gap-2 flex-col border border-slate-300 rounded p-4"
      >
        <ul className="pl-2 mb-2">
          {persons.map((p) => (
            <RemovePersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>

        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button type="submit" className={generalButton}>
            Remove
          </button>
        </div>
      </form>
    </>
  );
}
