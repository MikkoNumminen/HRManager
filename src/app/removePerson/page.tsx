import { redirect } from "next/navigation";
import Link from "next/link";
import { RemovePersonCheckBoxList } from "@/components/RemovePersonCheckBoxList";
import { generalButton, header } from "@/tailwindStyles";
import { getPersons, removePerson } from "@/serverActions";

async function handleSubmit(data: FormData) {
  "use server";
  await removePerson(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Remove person</h1>
      </header>

      <form
        action={handleSubmit}
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
