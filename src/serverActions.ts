"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, seedPermissions } from "@/permissions";
import { logAudit } from "@/auditLog";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(value: string, fieldName: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}

export async function createPerson(data: FormData) {
  await requirePermission("person:create");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }

  const email = data.get("email")?.valueOf();
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new Error("Email is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }

  const existingPerson = await prisma.person.findUnique({ where: { email } });
  if (existingPerson) {
    throw new Error("A person with this email already exists");
  }

  await prisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        name: name.trim(),
        position: null,
        email: email.trim(),
      },
    });
    await logAudit({
      action: "create",
      entityType: "person",
      entityId: person.id,
      after: { name: person.name, email: person.email },
      tx,
    });
  });
  revalidatePath("/managePersons");
  revalidatePath("/");
}

export async function removePerson(data: FormData) {
  await requirePermission("person:delete");
  const personIDs = data.getAll("personID").filter((v): v is string => typeof v === "string");
  if (personIDs.length === 0) {
    throw new Error("No personID selected");
  }
  personIDs.forEach((id) => validateUUID(id, "personID"));

  await prisma.$transaction(async (tx) => {
    const personsToDelete = await tx.person.findMany({
      where: { id: { in: personIDs } },
    });

    await tx.teamMember.deleteMany({
      where: { personId: { in: personIDs } },
    });

    await tx.person.deleteMany({
      where: { id: { in: personIDs } },
    });

    for (const person of personsToDelete) {
      await logAudit({
        action: "delete",
        entityType: "person",
        entityId: person.id,
        before: { name: person.name, email: person.email, position: person.position },
        tx,
      });
    }
  });
  revalidatePath("/managePersons");
  revalidatePath("/");
}

export async function updatePersonName(data: FormData) {
  await requirePermission("person:update_name");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }
  validateUUID(personID, "personID");

  const newName = data.get("name")?.toString().trim();
  if (!newName) {
    throw new Error("New name is missing");
  }

  await prisma.$transaction(async (tx) => {
    const personBefore = await tx.person.findUnique({ where: { id: personID } });
    await tx.person.update({
      where: { id: personID },
      data: { name: newName },
    });
    await logAudit({
      action: "update",
      entityType: "person",
      entityId: personID,
      before: { name: personBefore?.name },
      after: { name: newName },
      tx,
    });
  });
  revalidatePath("/managePersons");
  revalidatePath("/");
}

export async function updatePosition(data: FormData) {
  await requirePermission("person:update_position");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID provided");
  }
  validateUUID(personID, "personID");

  const newPosition = data.get("name")?.toString().trim();
  if (!newPosition) {
    throw new Error("New position is missing");
  }

  await prisma.$transaction(async (tx) => {
    const personBefore = await tx.person.findUnique({ where: { id: personID } });
    await tx.person.update({
      where: { id: personID },
      data: { position: newPosition },
    });
    await logAudit({
      action: "update",
      entityType: "person",
      entityId: personID,
      before: { position: personBefore?.position },
      after: { position: newPosition },
      tx,
    });
  });
  revalidatePath("/managePersons");
}

export async function updateEmail(data: FormData) {
  await requirePermission("person:update_email");
  const personID = data.get("personID")?.toString();
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(personID, "personID");

  const newEmail = data.get("name")?.toString().trim();
  if (!newEmail) {
    throw new Error("New Email is missing");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error("Invalid email format");
  }

  const existingPerson = await prisma.person.findUnique({ where: { email: newEmail } });
  if (existingPerson) {
    throw new Error("A person with this email already exists");
  }

  await prisma.$transaction(async (tx) => {
    const personBefore = await tx.person.findUnique({ where: { id: personID } });
    await tx.person.update({
      where: { id: personID },
      data: { email: newEmail },
    });
    await logAudit({
      action: "update",
      entityType: "person",
      entityId: personID,
      before: { email: personBefore?.email },
      after: { email: newEmail },
      tx,
    });
  });
  revalidatePath("/managePersons");
}

export async function addManager(data: FormData) {
  await requirePermission("team:update_manager");
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  const personID = data.get("personID")?.toString();

  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID provided");
  }
  teamIDs.forEach((id) => validateUUID(id, "teamID"));
  validateUUID(personID, "personID");

  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findUnique({ where: { teamId: teamIDs[0] } });
    await tx.team.update({
      where: { teamId: teamIDs[0] },
      data: { teamManagerId: personID },
    });
    await logAudit({
      action: "update",
      entityType: "team",
      entityId: teamIDs[0],
      before: { teamManagerId: teamBefore?.teamManagerId },
      after: { teamManagerId: personID },
      tx,
    });

    const existingMember = await tx.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamIDs[0],
        },
      },
    });

    if (!existingMember) {
      const member = await tx.teamMember.create({
        data: {
          personId: personID,
          teamId: teamIDs[0],
        },
      });
      await logAudit({
        action: "create",
        entityType: "teamMember",
        entityId: member.id,
        after: { personId: personID, teamId: teamIDs[0] },
        tx,
      });
    }
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageTeams");
}

export async function addMember(data: FormData) {
  await requirePermission("team:add_member");
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(teamID, "teamID");
  validateUUID(personID, "personID");

  await prisma.$transaction(async (tx) => {
    const existingMember = await tx.teamMember.findUnique({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID,
        },
      },
    });

    if (existingMember) {
      throw new Error("Person is already a member of the team");
    }

    const member = await tx.teamMember.create({
      data: {
        personId: personID,
        teamId: teamID,
      },
    });
    await logAudit({
      action: "create",
      entityType: "teamMember",
      entityId: member.id,
      after: { personId: personID, teamId: teamID },
      tx,
    });
  });
  revalidatePath("/manageTeams");
  redirect("..");
}

export async function createTeam(data: FormData) {
  await requirePermission("team:create");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        teamName: name.trim(),
        teamManagerId: null,
      },
    });
    await logAudit({
      action: "create",
      entityType: "team",
      entityId: team.teamId,
      after: { teamName: team.teamName },
      tx,
    });
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
}

export async function updateTeamName(data: FormData) {
  await requirePermission("team:update_name");
  const teamID = data.get("teamID")?.toString();
  if (!teamID) {
    throw new Error("No teamID provided");
  }
  validateUUID(teamID, "teamID");

  const newName = data.get("name")?.toString().trim();
  if (!newName) {
    throw new Error("New team name is missing");
  }

  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findUnique({ where: { teamId: teamID } });
    await tx.team.update({
      where: { teamId: teamID },
      data: { teamName: newName },
    });
    await logAudit({
      action: "update",
      entityType: "team",
      entityId: teamID,
      before: { teamName: teamBefore?.teamName },
      after: { teamName: newName },
      tx,
    });
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
}

export async function removeTeam(data: FormData) {
  await requirePermission("team:delete");
  const teamIDs = data.getAll("teamID").filter((v): v is string => typeof v === "string");
  if (teamIDs.length === 0) {
    throw new Error("No teamID selected");
  }
  teamIDs.forEach((id) => validateUUID(id, "teamID"));

  await prisma.$transaction(async (tx) => {
    const teamsToDelete = await tx.team.findMany({
      where: { teamId: { in: teamIDs } },
    });

    await tx.team.deleteMany({
      where: { teamId: { in: teamIDs } },
    });

    for (const team of teamsToDelete) {
      await logAudit({
        action: "delete",
        entityType: "team",
        entityId: team.teamId,
        before: { teamName: team.teamName, teamManagerId: team.teamManagerId },
        tx,
      });
    }
  });
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageTeams");
}

export async function removeMember(data: FormData) {
  await requirePermission("team:remove_member");
  const teamID = data.get("teamID")?.toString();
  const personID = data.get("personID")?.toString();

  if (!teamID) {
    throw new Error("No teamID selected");
  }
  if (!personID) {
    throw new Error("No personID selected");
  }
  validateUUID(teamID, "teamID");
  validateUUID(personID, "personID");

  await prisma.$transaction(async (tx) => {
    const existingMember = await tx.teamMember.findUnique({
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

    await tx.teamMember.delete({
      where: {
        personId_teamId: {
          personId: personID,
          teamId: teamID,
        },
      },
    });
    await logAudit({
      action: "delete",
      entityType: "teamMember",
      entityId: existingMember.id,
      before: { personId: personID, teamId: teamID },
      tx,
    });

    const team = await tx.team.findUnique({ where: { teamId: teamID } });
    if (team?.teamManagerId === personID) {
      await tx.team.update({
        where: { teamId: teamID },
        data: { teamManagerId: null },
      });
      await logAudit({
        action: "update",
        entityType: "team",
        entityId: teamID,
        before: { teamManagerId: personID },
        after: { teamManagerId: null },
        tx,
      });
    }
  });
  revalidatePath("/manageTeams");
  redirect("..");
}

export async function createDepartment(data: FormData) {
  await requirePermission("department:create");
  const name = data.get("name")?.valueOf();
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Invalid Name");
  }

  const description = data.get("description")?.toString().trim() || null;

  await prisma.$transaction(async (tx) => {
    const department = await tx.department.create({
      data: {
        name: name.trim(),
        description,
      },
    });
    await logAudit({
      action: "create",
      entityType: "department",
      entityId: department.id,
      after: { name: department.name, description: department.description },
      tx,
    });
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/");
}

export async function removeDepartment(data: FormData) {
  await requirePermission("department:delete");
  const departmentIDs = data
    .getAll("departmentID")
    .filter((v): v is string => typeof v === "string");
  if (departmentIDs.length === 0) {
    throw new Error("No departmentID selected");
  }
  departmentIDs.forEach((id) => validateUUID(id, "departmentID"));

  await prisma.$transaction(async (tx) => {
    const departmentsToDelete = await tx.department.findMany({
      where: { id: { in: departmentIDs } },
    });

    await tx.team.updateMany({
      where: { departmentId: { in: departmentIDs } },
      data: { departmentId: null },
    });

    await tx.department.deleteMany({
      where: { id: { in: departmentIDs } },
    });

    for (const dept of departmentsToDelete) {
      await logAudit({
        action: "delete",
        entityType: "department",
        entityId: dept.id,
        before: { name: dept.name, description: dept.description },
        tx,
      });
    }
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageDepartments");
}

export async function updateDepartment(data: FormData) {
  await requirePermission("department:update");
  const departmentID = data.get("departmentID")?.toString();
  if (!departmentID) {
    throw new Error("No departmentID provided");
  }
  validateUUID(departmentID, "departmentID");

  const name = data.get("name")?.toString().trim();
  if (!name) {
    throw new Error("Department name is required");
  }

  const description = data.get("description")?.toString().trim() || null;

  await prisma.$transaction(async (tx) => {
    const before = await tx.department.findUnique({ where: { id: departmentID } });
    await tx.department.update({
      where: { id: departmentID },
      data: { name, description },
    });
    await logAudit({
      action: "update",
      entityType: "department",
      entityId: departmentID,
      before: { name: before?.name, description: before?.description },
      after: { name, description },
      tx,
    });
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/");
}

export async function updateDepartmentHead(data: FormData) {
  await requirePermission("department:update");
  const departmentID = data.get("departmentID")?.toString();
  const personID = data.get("personID")?.toString() || null;

  if (!departmentID) {
    throw new Error("No departmentID provided");
  }
  validateUUID(departmentID, "departmentID");
  if (personID) validateUUID(personID, "personID");

  await prisma.$transaction(async (tx) => {
    const before = await tx.department.findUnique({ where: { id: departmentID } });
    await tx.department.update({
      where: { id: departmentID },
      data: { headId: personID },
    });
    await logAudit({
      action: "update",
      entityType: "department",
      entityId: departmentID,
      before: { headId: before?.headId },
      after: { headId: personID },
      tx,
    });
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/");
  redirect("/manageDepartments");
}

export async function assignTeamToDepartment(data: FormData) {
  await requirePermission("department:assign_team");
  const departmentID = data.get("departmentID")?.toString();
  const teamID = data.get("teamID")?.toString();

  if (!departmentID) throw new Error("No departmentID provided");
  if (!teamID) throw new Error("No teamID provided");
  validateUUID(departmentID, "departmentID");
  validateUUID(teamID, "teamID");

  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findUnique({ where: { teamId: teamID } });
    await tx.team.update({
      where: { teamId: teamID },
      data: { departmentId: departmentID },
    });
    await logAudit({
      action: "update",
      entityType: "team",
      entityId: teamID,
      before: { departmentId: teamBefore?.departmentId },
      after: { departmentId: departmentID },
      tx,
    });
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageDepartments");
}

export async function removeTeamFromDepartment(data: FormData) {
  await requirePermission("department:assign_team");
  const teamID = data.get("teamID")?.toString();

  if (!teamID) throw new Error("No teamID provided");
  validateUUID(teamID, "teamID");

  await prisma.$transaction(async (tx) => {
    const teamBefore = await tx.team.findUnique({ where: { teamId: teamID } });
    await tx.team.update({
      where: { teamId: teamID },
      data: { departmentId: null },
    });
    await logAudit({
      action: "update",
      entityType: "team",
      entityId: teamID,
      before: { departmentId: teamBefore?.departmentId },
      after: { departmentId: null },
      tx,
    });
  });
  revalidatePath("/manageDepartments");
  revalidatePath("/manageTeams");
  revalidatePath("/");
  redirect("/manageDepartments");
}

export async function resetAll() {
  await requirePermission("data:reset");
  await prisma.$transaction(async (tx) => {
    const counts = {
      teamMembers: await tx.teamMember.count(),
      teams: await tx.team.count(),
      departments: await tx.department.count(),
      persons: await tx.person.count(),
    };
    await tx.teamMember.deleteMany();
    await tx.team.deleteMany();
    await tx.department.deleteMany();
    await tx.person.deleteMany();
    await logAudit({
      action: "reset",
      entityType: "person",
      before: counts,
      tx,
    });
  });
  revalidatePath("/");
  revalidatePath("/managePersons");
  revalidatePath("/manageTeams");
  revalidatePath("/manageDepartments");
}

export async function seedMockData(clearExisting: boolean = true) {
  await requirePermission("data:seed");
  await prisma.$transaction(async (prisma) => {
    if (clearExisting) {
      await prisma.teamMember.deleteMany();
      await prisma.team.deleteMany();
      await prisma.department.deleteMany();
      await prisma.person.deleteMany();
    }

    // Upsert persons — find existing by email or create new
    const personSeeds = [
      { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
      { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
      { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
      { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
      { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
      { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
      { name: "Grace Park", position: "DevOps Lead", email: "grace@example.com" },
      { name: "Henry Chen", position: "Data Analyst", email: "henry@example.com" },
      { name: "Ivy Santos", position: "HR Coordinator", email: "ivy@example.com" },
    ];
    const persons = [];
    for (const p of personSeeds) {
      const person = await prisma.person.upsert({
        where: { email: p.email },
        update: {},
        create: p,
      });
      persons.push(person);
    }
    const [alice, bob, carol, dave, eve, frank, grace, henry, ivy] = persons;

    // Upsert teams — find existing by name or create new
    const teamSeeds = [
      { teamName: "Engineering", teamManagerId: alice.id },
      { teamName: "Design", teamManagerId: carol.id },
      { teamName: "Platform", teamManagerId: grace.id },
      { teamName: "Data Analytics", teamManagerId: henry.id },
      { teamName: "People & Culture", teamManagerId: ivy.id },
    ];
    const teams = [];
    for (const t of teamSeeds) {
      const team = await prisma.team.upsert({
        where: { teamName: t.teamName },
        update: {},
        create: t,
      });
      teams.push(team);
    }
    const [engineering, design, platform, dataAnalytics, peopleCulture] = teams;

    // Add members — skip if already a member
    const memberships = [
      { personId: alice.id, teamId: engineering.teamId },
      { personId: bob.id, teamId: engineering.teamId },
      { personId: dave.id, teamId: engineering.teamId },
      { personId: eve.id, teamId: engineering.teamId },
      { personId: carol.id, teamId: design.teamId },
      { personId: frank.id, teamId: design.teamId },
      { personId: grace.id, teamId: platform.teamId },
      { personId: dave.id, teamId: platform.teamId },
      { personId: henry.id, teamId: dataAnalytics.teamId },
      { personId: ivy.id, teamId: peopleCulture.teamId },
    ];
    for (const m of memberships) {
      const existing = await prisma.teamMember.findUnique({
        where: { personId_teamId: { personId: m.personId, teamId: m.teamId } },
      });
      if (!existing) {
        await prisma.teamMember.create({ data: m });
      }
    }

    // Upsert departments and assign teams
    const departmentSeeds = [
      {
        name: "Engineering",
        description: "Software development and infrastructure",
        headId: alice.id,
        teamNames: ["Engineering", "Platform"],
      },
      {
        name: "Product & Design",
        description: "Product management, UX, and design",
        headId: frank.id,
        teamNames: ["Design"],
      },
      {
        name: "Data",
        description: "Analytics, reporting, and data engineering",
        headId: henry.id,
        teamNames: ["Data Analytics"],
      },
      {
        name: "Human Resources",
        description: "People operations and talent management",
        headId: ivy.id,
        teamNames: ["People & Culture"],
      },
    ];
    for (const d of departmentSeeds) {
      const dept = await prisma.department.upsert({
        where: { name: d.name },
        update: {},
        create: { name: d.name, description: d.description, headId: d.headId },
      });
      for (const teamName of d.teamNames) {
        await prisma.team.updateMany({
          where: { teamName, departmentId: null },
          data: { departmentId: dept.id },
        });
      }
    }
  });

  // Seed mock users in a separate transaction — seedPermissions() opens its own
  // transaction internally, so this must run outside the main transaction to avoid
  // nested transaction deadlock
  const mockUserSeeds = [
    { email: "admin@example.com", name: "Jane Admin", role: "administrator" },
    { email: "user1@example.com", name: "John User", role: "user" },
    { email: "user2@example.com", name: "Sarah User", role: "user" },
    { email: "guest@example.com", name: "Demo Guest", role: "guest" },
  ];

  if (clearExisting) {
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { user: { email: { endsWith: "@example.com" } } },
      });
      await tx.user.deleteMany({
        where: { email: { endsWith: "@example.com" } },
      });
    });
  }

  await seedPermissions();

  await prisma.$transaction(async (tx) => {
    for (const u of mockUserSeeds) {
      const user = await tx.user.upsert({
        where: { email: u.email },
        update: {},
        create: u,
      });

      // Give admin@example.com a custom override: grant data:seed
      if (u.email === "admin@example.com") {
        const seedPerm = await tx.permission.findUnique({ where: { key: "data:seed" } });
        if (seedPerm) {
          await tx.userPermission.upsert({
            where: { userId_permissionId: { userId: user.id, permissionId: seedPerm.id } },
            update: { granted: true },
            create: { userId: user.id, permissionId: seedPerm.id, granted: true },
          });
        }
      }

      // Give user1@example.com a custom override: grant person:create
      if (u.email === "user1@example.com") {
        const createPerm = await tx.permission.findUnique({
          where: { key: "person:create" },
        });
        if (createPerm) {
          await tx.userPermission.upsert({
            where: { userId_permissionId: { userId: user.id, permissionId: createPerm.id } },
            update: { granted: true },
            create: { userId: user.id, permissionId: createPerm.id, granted: true },
          });
        }
      }
    }
  });

  await logAudit({
    action: "seed",
    entityType: "person",
    after: { clearExisting },
  });

  revalidatePath("/");
  revalidatePath("/managePersons");
  revalidatePath("/manageTeams");
  revalidatePath("/manageDepartments");
  revalidatePath("/admin");
}

export async function initializePermissions() {
  await requirePermission("admin:manage_users");
  await seedPermissions();
}

export async function updateUserRole(data: FormData) {
  await requirePermission("admin:manage_users");

  const userId = data.get("userId")?.toString();
  const newRole = data.get("role")?.toString();

  if (!userId) throw new Error("No userId provided");
  if (!newRole) throw new Error("No role provided");
  validateUUID(userId, "userId");

  const validRoles = ["administrator", "user", "guest"];
  if (!validRoles.includes(newRole)) {
    throw new Error("Invalid role. Cannot assign superuser role through the UI.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found");
  if (targetUser.role === "superuser") {
    throw new Error("Cannot change the superuser's role");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    await logAudit({
      action: "update",
      entityType: "user",
      entityId: userId,
      before: { role: targetUser.role, targetEmail: targetUser.email },
      after: { role: newRole, targetEmail: targetUser.email },
      tx,
    });
  });
  revalidatePath("/admin");
}

export async function updateUserPermission(data: FormData) {
  await requirePermission("admin:assign_permissions");

  const userId = data.get("userId")?.toString();
  const permissionKey = data.get("permissionKey")?.toString();
  const action = data.get("action")?.toString();

  if (!userId) throw new Error("No userId provided");
  if (!permissionKey) throw new Error("No permissionKey provided");
  if (!action) throw new Error("No action provided");
  validateUUID(userId, "userId");

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found");
  if (targetUser.role === "superuser") {
    throw new Error("Cannot modify superuser permissions");
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) throw new Error("Permission not found");

  await prisma.$transaction(async (tx) => {
    if (action === "reset") {
      await tx.userPermission.deleteMany({
        where: { userId, permissionId: permission.id },
      });
      await logAudit({
        action: "delete",
        entityType: "userPermission",
        entityId: userId,
        before: { permissionKey, action: "reset", targetEmail: targetUser.email },
        tx,
      });
    } else {
      const granted = action === "grant";
      await tx.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id,
          },
        },
        update: { granted },
        create: { userId, permissionId: permission.id, granted },
      });
      await logAudit({
        action: "update",
        entityType: "userPermission",
        entityId: userId,
        after: { permissionKey, granted, targetEmail: targetUser.email },
        tx,
      });
    }
  });
  revalidatePath("/admin");
}
