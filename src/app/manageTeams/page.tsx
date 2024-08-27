import Link from "next/link";
import { TeamsCheckBoxList } from "@/components/TeamsCheckboxList";
import { PersonCheckBoxList } from "@/components/PersonCheckboxList";
import { ManageTeamsCheckBoxList } from "@/components/ManageTeamCheckBoxList";
import {
  collectedPageForm,
  generalButton,
  header,
  inputField,
} from "@/tailwindStyles";
import {
  addManager,
  addMember,
  createTeam,
  getPersons,
  getTeams,
  removeMember,
  removeTeam,
} from "@/serverActions";

export default async function Page() {
  const teams = await getTeams();
  const persons = await getPersons();
  return (
    <>
      <header className={header}>
        <h1 className="text-2xl"> Manage Teams </h1>
      </header>

      <form action={createTeam} className={collectedPageForm}>
        <header className={header}>
          <h1 className="text-2xl"> Add Team </h1>
        </header>
        <input
          type="text"
          name="name"
          placeholder="Enter Team Name"
          className={inputField}
        ></input>
        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button className={generalButton}>Create</button>
        </div>
      </form>

      <form action={removeTeam} className={collectedPageForm}>
        <header className={header}>
          <h1 className="text-2xl">Remove Team</h1>
        </header>
        <ul className="pl-2 mb-2">
          {teams.map((p) => (
            <TeamsCheckBoxList key={p.teamId} {...p} />
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

      <form action={addManager} className={collectedPageForm}>
        <header className={header}>
          <h1 className="text-2xl">Add Manager to Team</h1>
        </header>
        <ul className="pl-2 mb-2">
          <p>Select Team</p>
          {teams.map((p) => (
            <ManageTeamsCheckBoxList key={p.teamId} {...p} />
          ))}
        </ul>

        <ul className="pl-2 mb-2">
          <p>Select Manager</p>
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>

        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button type="submit" className={generalButton}>
            Add Manager
          </button>
        </div>
      </form>

      <form action={addMember} className={collectedPageForm}>
        <header className={header}>
          <h1 className="text-2xl">Add Member to Team</h1>
        </header>
        <ul className="pl-2 mb-2">
          <p>Select Team</p>
          {teams.map((p) => (
            <ManageTeamsCheckBoxList key={p.teamId} {...p} />
          ))}
        </ul>

        <ul className="pl-2 mb-2">
          <p>Select Member</p>
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>

        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button type="submit" className={generalButton}>
            Add Member
          </button>
        </div>
      </form>

      <form action={removeMember} className={collectedPageForm}>
        <header className={header}>
          <h1 className="text-2xl">Remove Member from Team</h1>
        </header>
        <ul className="pl-2 mb-2">
          <p>Select Team</p>
          {teams.map((p) => (
            <ManageTeamsCheckBoxList key={p.teamId} {...p} />
          ))}
        </ul>

        <ul className="pl-2 mb-2">
          <p>Select Member</p>
          {persons.map((p) => (
            <PersonCheckBoxList key={p.id} {...p} />
          ))}
        </ul>

        <div className="flex gap-1 justify-end">
          <Link href=".." className={generalButton}>
            Cancel
          </Link>
          <button type="submit" className={generalButton}>
            Remove Member
          </button>
        </div>
      </form>
    </>
  );
}
