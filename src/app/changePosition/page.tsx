import { redirect } from "next/navigation";
import Link from "next/link";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import { changeFormStyle, generalButton, header } from "@/tailwindStyles";
import { getPersons, updatePosition } from "@/serverActions";

async function handleSubmit(data: FormData) {
  "use server";
  await updatePosition(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Change Position</h1>
      </header>

      <form action={handleSubmit} method="POST" className={changeFormStyle}>
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
