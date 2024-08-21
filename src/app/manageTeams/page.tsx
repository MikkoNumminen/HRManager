import { prisma } from "@/db";
import { redirect } from "next/navigation";
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
import { TeamSchema } from "@/zodStyles";
import { getPersons } from "@/utilities";
import { addManager, addMember } from "@/serverActions";

// Server action, experimental
async function createTeam(data: FormData) {
  "use server";

  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Invalid Name");
  }

  await prisma.team.create({
    data: {
      teamName: name,
      teamManagerId: "-",
    },
  });
  redirect("/");
}

async function removeTeam(data: FormData) {
  "use server";

  const teamID = data.getAll("teamID") as string[];
  if (!Array.isArray(teamID) || teamID.length === 0) {
    throw new Error("No teamID selected");
  }
  await prisma.team.deleteMany({
    where: {
      teamId: { in: teamID },
    },
  });
  redirect("/");
}

async function removeMember(data: FormData) {
  "use server";

  const teamID = data.get("teamID") as string;
  const personID = data.get("personID") as string;

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      personId_teamId: {
        personId: personID,
        teamId: teamID,
      },
    },
  });

  if (!existingMember) {
    throw new Error("Person is not a member of the team");
  }

  const deletedMember = await prisma.teamMember.delete({
    where: {
      personId_teamId: {
        personId: personID,
        teamId: teamID,
      },
    },
  });

  console.log("Team Member removed:", deletedMember);

  redirect("..");
}

async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            person: true,
          },
        },
      },
    });

    teams.forEach((team) => {
      try {
        TeamSchema.parse({
          teamId: team.teamId,
          teamName: team.teamName,
          teamManagerId: team.teamManagerId,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          members: team.members.map((member) => ({
            name: member.person.name,
            email: member.person.email,
          })),
        });
      } catch (error) {
        console.error(`Team validation failed: ${error}`);
      }
    });

    return teams.map((team) => ({
      teamName: team.teamName,
      teamId: team.teamId,
      teamManagerId: team.teamManagerId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members: team.members.map((member) => ({
        name: member.person.name,
        email: member.person.email,
      })),
    }));
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

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
          <h1 className="text-2xl">Remove Member to Team</h1>
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
