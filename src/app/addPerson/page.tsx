import { prisma } from "@/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { generalButton, header, inputField } from "@/tailwindStyles";

// Server action, experimental
async function createPerson(data: FormData) {
    "use server"

    const name = data.get("name")?.valueOf()
    if (typeof name !== "string" || name.length === 0) {
        throw new Error("Invalid Name")
    }
    await prisma.person.create({data: {name, position: "-"}})
    redirect("/")
}

export default function Page() {
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl"> New person </h1>
      </header>
      <form action={createPerson} className="flex gap-2 flex-col">
        <input
          type="text"
          name="name"
          placeholder="Enter Name"
          className={inputField}
        ></input>
        <div className="flex gap-1 justify-end">
          <Link
            href=".."
            className={generalButton}
          >
            Cancel
          </Link>
          <button className={generalButton}>
            Create
          </button>
        </div>
      </form>
    </>
  );
}
