import { redirect } from "next/navigation";
import Link from "next/link";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import {
  changeFormStyle,
  generalButton,
  header,
  inputFieldFlex,
} from "@/tailwindStyles";
import { getPersons, updateEmail } from "@/serverActions";

async function handleSubmit(data: FormData) {
  "use server";
  await updateEmail(data);
  redirect("/");
}

export default async function Page() {
  const persons = await getPersons();
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl">Change Email</h1>
      </header>

      <form action={handleSubmit} method="POST" className={changeFormStyle}>
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
