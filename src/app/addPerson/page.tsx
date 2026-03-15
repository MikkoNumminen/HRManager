import { redirect } from "next/navigation";
import Link from "next/link";
import { generalButton, header, inputField } from "@/tailwindStyles";
import { createPerson } from "@/serverActions";

async function handleSubmit(data: FormData) {
  "use server";
  await createPerson(data);
  redirect("/");
}

export default function Page() {
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl"> New person </h1>
      </header>
      <form action={handleSubmit} className="flex gap-2 flex-col">
        <input
          type="text"
          name="name"
          placeholder="Enter Name"
          className={inputField}
        />
        <input
          type="text"
          name="email"
          placeholder="Enter Email"
          className={inputField}
        />
        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button className={generalButton}>Create</button>
        </div>
      </form>
    </>
  );
}
