import {
  PersonSchema,
  TeamMemberSchema,
  TeamSchema,
  DepartmentSchema,
  DepartmentTeamSchema,
  UserSchema,
  UserProfileSchema,
  PermissionsSchema,
  AuditLogSchema,
  AuditLogFilterSchema,
  AuditActionSchema,
  AuditEntityTypeSchema,
  DashboardTeamSizeSchema,
  DashboardDepartmentSizeSchema,
  DashboardGrowthPointSchema,
  DashboardRecentActivitySchema,
  DashboardMetricsSchema,
  MAX_URL_LENGTH,
  ImageUrlSchema,
  MAX_EXPORT_ROWS,
} from "@/schemas";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_UUID_2 = "c2ddfe11-be2d-4af9-8c7e-8ddadf592c33";
const NOW = new Date();

describe("PersonSchema", () => {
  const validPerson = {
    id: VALID_UUID,
    name: "John Doe",
    position: "Developer",
    email: "john@example.com",
    createdAt: NOW,
    updatedAt: NOW,
  };

  // Give it all the right info and it should be happy — no complaints.
  test("accepts a fully valid person", () => {
    expect(() => PersonSchema.parse(validPerson)).not.toThrow();
  });

  // Position and email are optional in the database, so null is totally fine.
  test("accepts null position and email", () => {
    const person = { ...validPerson, position: null, email: null };
    const result = PersonSchema.parse(person);
    expect(result.position).toBeNull();
    expect(result.email).toBeNull();
  });

  // Every person needs a name. No name? No entry.
  test("rejects missing name", () => {
    const person = { ...validPerson, name: undefined };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // An empty string is not a name — you have to actually type something.
  test("rejects empty name", () => {
    const person = { ...validPerson, name: "" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // The ID has to look like a real UUID, not just any random text.
  test("rejects invalid UUID for id", () => {
    const person = { ...validPerson, id: "not-a-uuid" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // You can't skip the ID entirely — every person needs one to be identified.
  test("rejects missing id", () => {
    const { id: _, ...person } = validPerson;
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // createdAt has to be an actual Date object, not a string like "yesterday".
  test("rejects non-date createdAt", () => {
    const person = { ...validPerson, createdAt: "not-a-date" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Same for updatedAt — a number isn't a date either.
  test("rejects non-date updatedAt", () => {
    const person = { ...validPerson, updatedAt: 12345 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Names are text, not numbers. 123 is not a valid name.
  test("rejects numeric name", () => {
    const person = { ...validPerson, name: 123 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Position can be null or a string, but a number sneaking in is not allowed.
  test("rejects numeric position (non-string, non-null)", () => {
    const person = { ...validPerson, position: 42 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // What goes in should come back out exactly the same — no data lost or changed.
  test("preserves all fields after parsing", () => {
    const result = PersonSchema.parse(validPerson);
    expect(result).toEqual(validPerson);
  });
});

describe("TeamMemberSchema", () => {
  const validMember = {
    personId: VALID_UUID,
    name: "Jane Smith",
    email: "jane@example.com",
  };

  // A member with all valid fields should pass without issues.
  test("accepts a valid team member", () => {
    expect(() => TeamMemberSchema.parse(validMember)).not.toThrow();
  });

  // Not everyone has an email on file — null is an acceptable value here.
  test("accepts null email", () => {
    const member = { ...validMember, email: null };
    const result = TeamMemberSchema.parse(member);
    expect(result.email).toBeNull();
  });

  // The personId links to a real person, so it has to be a proper UUID.
  test("rejects invalid UUID for personId", () => {
    const member = { ...validMember, personId: "bad" };
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  // A team member without a name is meaningless — we need to know who they are.
  test("rejects missing name", () => {
    const { name: _, ...member } = validMember;
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  // Without a personId, we can't link this member to anyone in the database.
  test("rejects missing personId", () => {
    const { personId: _, ...member } = validMember;
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });
});

describe("TeamSchema", () => {
  const validTeam = {
    teamId: VALID_UUID,
    teamName: "Engineering",
    teamManagerId: VALID_UUID_2,
    managerName: "Alice",
    departmentId: VALID_UUID,
    departmentName: "Product",
    createdAt: NOW,
    updatedAt: NOW,
    members: [
      { personId: VALID_UUID, name: "Bob", email: "bob@example.com" },
      { personId: VALID_UUID_2, name: "Carol", email: null },
    ],
  };

  // A complete team with manager and members — everything checks out.
  test("accepts a fully valid team", () => {
    expect(() => TeamSchema.parse(validTeam)).not.toThrow();
  });

  // A team doesn't need a manager right away — null is fine until one is assigned.
  test("accepts null teamManagerId and managerName", () => {
    const team = { ...validTeam, teamManagerId: null, managerName: null };
    const result = TeamSchema.parse(team);
    expect(result.teamManagerId).toBeNull();
    expect(result.managerName).toBeNull();
  });

  // A brand new team might not have anyone in it yet — empty list is valid.
  test("accepts empty members array", () => {
    const team = { ...validTeam, members: [] };
    const result = TeamSchema.parse(team);
    expect(result.members).toEqual([]);
  });

  // Every team needs a name so you can tell them apart.
  test("rejects empty teamName", () => {
    const team = { ...validTeam, teamName: "" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // The team's ID has to be a real UUID — no made-up strings.
  test("rejects invalid UUID for teamId", () => {
    const team = { ...validTeam, teamId: "nope" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // If there IS a manager ID, it has to be a valid UUID — can't just put anything there.
  test("rejects invalid UUID for teamManagerId (non-null)", () => {
    const team = { ...validTeam, teamManagerId: "not-uuid" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // The members field is required — even if it's empty, it has to be there as an array.
  test("rejects missing members array", () => {
    const { members: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // If one member in the list has bad data, the whole team validation fails.
  test("rejects invalid member inside members array", () => {
    const team = { ...validTeam, members: [{ personId: "bad", name: "X", email: null }] };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // Just like with persons — what goes in should come back out identical.
  test("preserves all fields after parsing", () => {
    const result = TeamSchema.parse(validTeam);
    expect(result).toEqual(validTeam);
  });

  // You can't skip the team name field entirely — it's required.
  test("rejects missing teamName", () => {
    const { teamName: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // Timestamps need to be real Date objects, not casual strings.
  test("rejects non-date createdAt", () => {
    const team = { ...validTeam, createdAt: "yesterday" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });
});

describe("UserSchema", () => {
  const validUser = {
    id: VALID_UUID,
    email: "alice@example.com",
    name: "Alice",
    image: "https://example.com/avatar.png",
    role: "administrator" as const,
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A complete user with all fields should parse without any issues.
  test("accepts a fully valid user", () => {
    expect(() => UserSchema.parse(validUser)).not.toThrow();
  });

  // Name and image are optional in OAuth — some providers don't give them.
  test("accepts null name and image", () => {
    const user = { ...validUser, name: null, image: null };
    const result = UserSchema.parse(user);
    expect(result.name).toBeNull();
    expect(result.image).toBeNull();
  });

  // All four roles should be accepted — superuser, administrator, user, guest.
  test("accepts all four valid roles", () => {
    for (const role of ["superuser", "administrator", "user", "guest"]) {
      expect(() => UserSchema.parse({ ...validUser, role })).not.toThrow();
    }
  });

  // A made-up role like "moderator" should be rejected — only the four defined roles are valid.
  test("rejects invalid role", () => {
    const user = { ...validUser, role: "moderator" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // The email must be a proper email format — "not-an-email" won't fly.
  test("rejects invalid email format", () => {
    const user = { ...validUser, email: "not-an-email" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Every user needs an email — it's how we identify them from OAuth.
  test("rejects missing email", () => {
    const { email: _, ...user } = validUser;
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // The ID has to be a proper UUID, not some random text.
  test("rejects invalid UUID for id", () => {
    const user = { ...validUser, id: "bad-id" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Every user needs an ID — can't skip it.
  test("rejects missing id", () => {
    const { id: _, ...user } = validUser;
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Timestamps must be real Date objects, not strings or numbers.
  test("rejects non-date createdAt", () => {
    const user = { ...validUser, createdAt: "yesterday" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Same for updatedAt — must be a Date.
  test("rejects non-date updatedAt", () => {
    const user = { ...validUser, updatedAt: 12345 };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // What goes in should come back out exactly the same.
  test("preserves all fields after parsing", () => {
    const result = UserSchema.parse(validUser);
    expect(result).toEqual(validUser);
  });
});

describe("PermissionsSchema", () => {
  // A map of permission keys to booleans should parse fine.
  test("accepts a valid permissions record", () => {
    const perms = { "person:create": true, "person:delete": false, "team:read": true };
    expect(() => PermissionsSchema.parse(perms)).not.toThrow();
  });

  // An empty permissions object is valid — it just means no permissions listed.
  test("accepts an empty object", () => {
    const result = PermissionsSchema.parse({});
    expect(result).toEqual({});
  });

  // Permission values must be booleans — strings like "yes" are not allowed.
  test("rejects non-boolean values", () => {
    const perms = { "person:create": "yes" };
    expect(() => PermissionsSchema.parse(perms)).toThrow();
  });

  // Permission values must be booleans — numbers are not allowed either.
  test("rejects numeric values", () => {
    const perms = { "person:create": 1 };
    expect(() => PermissionsSchema.parse(perms)).toThrow();
  });

  // What goes in should come back out exactly the same.
  test("preserves all entries after parsing", () => {
    const perms = { "data:reset": true, "data:seed": false };
    const result = PermissionsSchema.parse(perms);
    expect(result).toEqual(perms);
  });
});

describe("AuditActionSchema", () => {
  // All five action types should be accepted.
  test("accepts all valid actions", () => {
    for (const action of ["create", "update", "delete", "seed", "reset"]) {
      expect(() => AuditActionSchema.parse(action)).not.toThrow();
    }
  });

  // A made-up action should be rejected.
  test("rejects invalid action", () => {
    expect(() => AuditActionSchema.parse("bulk_delete")).toThrow();
  });
});

describe("AuditEntityTypeSchema", () => {
  // All six entity types should be accepted.
  test("accepts all valid entity types", () => {
    for (const type of ["person", "team", "teamMember", "department", "user", "userPermission"]) {
      expect(() => AuditEntityTypeSchema.parse(type)).not.toThrow();
    }
  });

  // A made-up entity type should be rejected.
  test("rejects invalid entity type", () => {
    expect(() => AuditEntityTypeSchema.parse("invoice")).toThrow();
  });
});

describe("AuditLogSchema", () => {
  const validLog = {
    id: VALID_UUID,
    userId: VALID_UUID_2,
    userEmail: "alice@example.com",
    action: "create" as const,
    entityType: "person" as const,
    entityId: VALID_UUID,
    before: null,
    after: '{"name":"Alice"}',
    createdAt: NOW,
  };

  // A complete audit log entry with all fields should parse fine.
  test("accepts a fully valid audit log entry", () => {
    expect(() => AuditLogSchema.parse(validLog)).not.toThrow();
  });

  // Audit logs can exist without a user (system actions) — null userId and userEmail are fine.
  test("accepts null userId, userEmail, entityId, before, and after", () => {
    const log = {
      ...validLog,
      userId: null,
      userEmail: null,
      entityId: null,
      before: null,
      after: null,
    };
    const result = AuditLogSchema.parse(log);
    expect(result.userId).toBeNull();
    expect(result.userEmail).toBeNull();
    expect(result.entityId).toBeNull();
  });

  // The ID accepts any string (MongoDB ObjectId or UUID).
  test("accepts MongoDB ObjectId as id", () => {
    const log = { ...validLog, id: "507f1f77bcf86cd799439011" };
    expect(() => AuditLogSchema.parse(log)).not.toThrow();
  });

  // Only valid action types are allowed.
  test("rejects invalid action", () => {
    const log = { ...validLog, action: "explode" };
    expect(() => AuditLogSchema.parse(log)).toThrow();
  });

  // Only valid entity types are allowed.
  test("rejects invalid entityType", () => {
    const log = { ...validLog, entityType: "widget" };
    expect(() => AuditLogSchema.parse(log)).toThrow();
  });

  // createdAt must be a Date, not a string.
  test("rejects non-date createdAt", () => {
    const log = { ...validLog, createdAt: "yesterday" };
    expect(() => AuditLogSchema.parse(log)).toThrow();
  });

  // What goes in should come back out exactly the same.
  test("preserves all fields after parsing", () => {
    const result = AuditLogSchema.parse(validLog);
    expect(result).toEqual(validLog);
  });
});

describe("AuditLogFilterSchema", () => {
  // An empty object should parse with defaults for page and pageSize.
  test("provides defaults for page and pageSize", () => {
    const result = AuditLogFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  // All optional filter fields should be accepted when provided.
  test("accepts all optional filter fields", () => {
    const filters = {
      userEmail: "alice@example.com",
      action: "create" as const,
      entityType: "person" as const,
      dateFrom: NOW,
      dateTo: NOW,
      page: 2,
      pageSize: 50,
    };
    const result = AuditLogFilterSchema.parse(filters);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(result.userEmail).toBe("alice@example.com");
  });

  // Page must be at least 1 — no zero or negative pages.
  test("rejects page less than 1", () => {
    expect(() => AuditLogFilterSchema.parse({ page: 0 })).toThrow();
  });

  // pageSize can't exceed 100 — that's the maximum.
  test("rejects pageSize greater than 100", () => {
    expect(() => AuditLogFilterSchema.parse({ pageSize: 101 })).toThrow();
  });

  // pageSize must be at least 1.
  test("rejects pageSize less than 1", () => {
    expect(() => AuditLogFilterSchema.parse({ pageSize: 0 })).toThrow();
  });

  // Invalid action in filter should be rejected.
  test("rejects invalid action filter", () => {
    expect(() => AuditLogFilterSchema.parse({ action: "nope" })).toThrow();
  });
});

describe("DepartmentTeamSchema", () => {
  // A valid department team reference with teamId and teamName.
  test("accepts a valid department team", () => {
    expect(() => DepartmentTeamSchema.parse({ teamId: VALID_UUID, teamName: "Eng" })).not.toThrow();
  });

  // Missing teamId should fail.
  test("rejects missing teamId", () => {
    expect(() => DepartmentTeamSchema.parse({ teamName: "Eng" })).toThrow();
  });
});

describe("DepartmentSchema", () => {
  const validDepartment = {
    id: VALID_UUID,
    name: "Engineering",
    description: "Software development",
    headId: VALID_UUID_2,
    headName: "Alice",
    createdAt: NOW,
    updatedAt: NOW,
    teams: [{ teamId: VALID_UUID, teamName: "Platform" }],
  };

  // A complete department with all fields should parse fine.
  test("accepts a fully valid department", () => {
    expect(() => DepartmentSchema.parse(validDepartment)).not.toThrow();
  });

  // Department description can be null.
  test("accepts null description", () => {
    const dept = { ...validDepartment, description: null };
    const result = DepartmentSchema.parse(dept);
    expect(result.description).toBeNull();
  });

  // Department head can be null (no head assigned yet).
  test("accepts null headId and headName", () => {
    const dept = { ...validDepartment, headId: null, headName: null };
    const result = DepartmentSchema.parse(dept);
    expect(result.headId).toBeNull();
    expect(result.headName).toBeNull();
  });

  // A department with no teams is valid (empty array).
  test("accepts empty teams array", () => {
    const dept = { ...validDepartment, teams: [] };
    const result = DepartmentSchema.parse(dept);
    expect(result.teams).toEqual([]);
  });

  // Department name is required and must be non-empty.
  test("rejects empty name", () => {
    const dept = { ...validDepartment, name: "" };
    expect(() => DepartmentSchema.parse(dept)).toThrow();
  });

  // Department ID must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    const dept = { ...validDepartment, id: "not-a-uuid" };
    expect(() => DepartmentSchema.parse(dept)).toThrow();
  });

  // If headId is provided, it must be a valid UUID.
  test("rejects invalid UUID for headId (non-null)", () => {
    const dept = { ...validDepartment, headId: "bad" };
    expect(() => DepartmentSchema.parse(dept)).toThrow();
  });

  // Teams array is required — missing it should fail.
  test("rejects missing teams array", () => {
    const { teams: _, ...dept } = validDepartment;
    expect(() => DepartmentSchema.parse(dept)).toThrow();
  });

  // Invalid team inside teams array should fail the whole validation.
  test("rejects invalid team inside teams array", () => {
    const dept = { ...validDepartment, teams: [{ teamId: "bad", teamName: "X" }] };
    expect(() => DepartmentSchema.parse(dept)).toThrow();
  });
});

describe("DashboardTeamSizeSchema", () => {
  // Accepts a valid team size entry.
  test("accepts valid team size", () => {
    const result = DashboardTeamSizeSchema.parse({ teamName: "Alpha", memberCount: 5 });
    expect(result.teamName).toBe("Alpha");
    expect(result.memberCount).toBe(5);
  });

  // Rejects missing teamName.
  test("rejects missing teamName", () => {
    expect(() => DashboardTeamSizeSchema.parse({ memberCount: 3 })).toThrow();
  });

  // Rejects non-integer memberCount.
  test("rejects non-integer memberCount", () => {
    expect(() => DashboardTeamSizeSchema.parse({ teamName: "A", memberCount: 2.5 })).toThrow();
  });
});

describe("DashboardDepartmentSizeSchema", () => {
  // Accepts a valid department size entry.
  test("accepts valid department size", () => {
    const result = DashboardDepartmentSizeSchema.parse({
      departmentName: "Engineering",
      teamCount: 3,
    });
    expect(result.departmentName).toBe("Engineering");
    expect(result.teamCount).toBe(3);
  });

  // Rejects missing departmentName.
  test("rejects missing departmentName", () => {
    expect(() => DashboardDepartmentSizeSchema.parse({ teamCount: 1 })).toThrow();
  });
});

describe("DashboardGrowthPointSchema", () => {
  // Accepts a valid growth point.
  test("accepts valid growth point", () => {
    const result = DashboardGrowthPointSchema.parse({
      date: "2026-01-15",
      persons: 10,
      teams: 3,
      departments: 2,
    });
    expect(result.date).toBe("2026-01-15");
    expect(result.persons).toBe(10);
  });

  // Rejects non-integer values.
  test("rejects non-integer persons", () => {
    expect(() =>
      DashboardGrowthPointSchema.parse({
        date: "2026-01-15",
        persons: 1.5,
        teams: 1,
        departments: 1,
      }),
    ).toThrow();
  });
});

describe("DashboardRecentActivitySchema", () => {
  // Accepts a valid activity entry.
  test("accepts valid activity entry", () => {
    const result = DashboardRecentActivitySchema.parse({
      action: "create",
      entityType: "person",
      userEmail: "admin@example.com",
      createdAt: NOW,
    });
    expect(result.action).toBe("create");
    expect(result.entityType).toBe("person");
  });

  // Accepts null userEmail.
  test("accepts null userEmail", () => {
    const result = DashboardRecentActivitySchema.parse({
      action: "seed",
      entityType: "person",
      userEmail: null,
      createdAt: NOW,
    });
    expect(result.userEmail).toBeNull();
  });

  // Rejects invalid action.
  test("rejects invalid action", () => {
    expect(() =>
      DashboardRecentActivitySchema.parse({
        action: "explode",
        entityType: "person",
        userEmail: null,
        createdAt: NOW,
      }),
    ).toThrow();
  });
});

describe("DashboardMetricsSchema", () => {
  const validMetrics = {
    totalPersons: 10,
    totalTeams: 3,
    totalDepartments: 2,
    totalUsers: 5,
    teamSizes: [{ teamName: "Alpha", memberCount: 4 }],
    departmentSizes: [{ departmentName: "Eng", teamCount: 2 }],
    growthTimeline: [{ date: "2026-01-15", persons: 5, teams: 2, departments: 1 }],
    recentActivity: [
      {
        action: "create" as const,
        entityType: "person" as const,
        userEmail: "a@b.com",
        createdAt: NOW,
      },
    ],
  };

  // Accepts a fully valid dashboard metrics object.
  test("accepts valid dashboard metrics", () => {
    const result = DashboardMetricsSchema.parse(validMetrics);
    expect(result.totalPersons).toBe(10);
    expect(result.teamSizes).toHaveLength(1);
    expect(result.recentActivity).toHaveLength(1);
  });

  // Accepts empty arrays for all list fields.
  test("accepts empty arrays", () => {
    const result = DashboardMetricsSchema.parse({
      ...validMetrics,
      teamSizes: [],
      departmentSizes: [],
      growthTimeline: [],
      recentActivity: [],
    });
    expect(result.teamSizes).toEqual([]);
  });

  // Rejects missing required count fields.
  test("rejects missing totalPersons", () => {
    const { totalPersons: _, ...metrics } = validMetrics;
    expect(() => DashboardMetricsSchema.parse(metrics)).toThrow();
  });

  // Rejects non-integer counts.
  test("rejects non-integer totalTeams", () => {
    expect(() => DashboardMetricsSchema.parse({ ...validMetrics, totalTeams: 2.5 })).toThrow();
  });
});

describe("UserProfileSchema", () => {
  const validProfile = {
    id: VALID_UUID,
    email: "alice@example.com",
    name: "Alice",
    image: "https://example.com/avatar.jpg",
    role: "administrator" as const,
    createdAt: NOW,
    updatedAt: NOW,
    resolvedPermissions: { "person:create": true, "person:read": false },
  };

  // Accepts a complete, valid user profile.
  test("accepts a fully valid profile", () => {
    expect(() => UserProfileSchema.parse(validProfile)).not.toThrow();
  });

  // Name and image can both be null (OAuth user without name, no custom avatar).
  test("accepts null name and null image", () => {
    const profile = { ...validProfile, name: null, image: null };
    const result = UserProfileSchema.parse(profile);
    expect(result.name).toBeNull();
    expect(result.image).toBeNull();
  });

  // All four roles are accepted.
  test("accepts all four valid roles", () => {
    for (const role of ["superuser", "administrator", "user", "guest"]) {
      expect(() => UserProfileSchema.parse({ ...validProfile, role })).not.toThrow();
    }
  });

  // Made-up roles like "moderator" should fail.
  test("rejects invalid role", () => {
    expect(() => UserProfileSchema.parse({ ...validProfile, role: "moderator" })).toThrow();
  });

  // resolvedPermissions must be a record of string → boolean.
  test("rejects non-boolean values in resolvedPermissions", () => {
    expect(() =>
      UserProfileSchema.parse({ ...validProfile, resolvedPermissions: { key: "yes" } }),
    ).toThrow();
  });

  // Empty permissions record is fine (guest with no permissions).
  test("accepts empty resolvedPermissions", () => {
    const result = UserProfileSchema.parse({ ...validProfile, resolvedPermissions: {} });
    expect(result.resolvedPermissions).toEqual({});
  });

  // Invalid UUID for id should fail.
  test("rejects invalid UUID for id", () => {
    expect(() => UserProfileSchema.parse({ ...validProfile, id: "not-a-uuid" })).toThrow();
  });

  // Invalid email format should fail.
  test("rejects invalid email", () => {
    expect(() => UserProfileSchema.parse({ ...validProfile, email: "not-email" })).toThrow();
  });
});

describe("MAX_URL_LENGTH", () => {
  // The URL max length constant should be 2048 characters (standard browser URL limit).
  test("is 2048", () => {
    expect(MAX_URL_LENGTH).toBe(2048);
  });
});

describe("ImageUrlSchema", () => {
  // Google OAuth avatar URLs (lh3.googleusercontent.com) must be accepted.
  test("accepts lh3.googleusercontent.com URL", () => {
    expect(() =>
      ImageUrlSchema.parse("https://lh3.googleusercontent.com/a/user-photo"),
    ).not.toThrow();
  });

  // GitHub OAuth avatar URLs must be accepted.
  test("accepts avatars.githubusercontent.com URL", () => {
    expect(() =>
      ImageUrlSchema.parse("https://avatars.githubusercontent.com/u/12345?v=4"),
    ).not.toThrow();
  });

  // Any subdomain of googleusercontent.com must be accepted (CDN pattern).
  test("accepts arbitrary subdomain of googleusercontent.com", () => {
    expect(() =>
      ImageUrlSchema.parse("https://other-cdn.googleusercontent.com/photo.jpg"),
    ).not.toThrow();
  });

  // Other known CDN hosts (Gravatar, Discord, Twitter, Imgur) must be accepted.
  test("accepts gravatar.com URL", () => {
    expect(() => ImageUrlSchema.parse("https://www.gravatar.com/avatar/abc123")).not.toThrow();
  });

  test("accepts cdn.discordapp.com URL", () => {
    expect(() =>
      ImageUrlSchema.parse("https://cdn.discordapp.com/avatars/123/abc.png"),
    ).not.toThrow();
  });

  test("accepts pbs.twimg.com URL", () => {
    expect(() =>
      ImageUrlSchema.parse("https://pbs.twimg.com/profile_images/123/photo.jpg"),
    ).not.toThrow();
  });

  test("accepts i.imgur.com URL", () => {
    expect(() => ImageUrlSchema.parse("https://i.imgur.com/AbCdEf.jpg")).not.toThrow();
  });

  // An arbitrary domain not on the allowlist must be rejected with imageUrlDomainNotAllowed.
  test("rejects https://evil.com/avatar.png with imageUrlDomainNotAllowed", () => {
    const result = ImageUrlSchema.safeParse("https://evil.com/avatar.png");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("imageUrlDomainNotAllowed");
  });

  // Non-http/https protocols (ftp, javascript, etc.) must be rejected.
  test("rejects non-http protocol", () => {
    const result = ImageUrlSchema.safeParse("ftp://lh3.googleusercontent.com/file.png");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalidUrlProtocol");
  });

  // Completely malformed strings that cannot be parsed as URLs must be rejected.
  test("rejects invalid URL format", () => {
    const result = ImageUrlSchema.safeParse("not-a-url");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("invalidUrlFormat");
  });

  // An empty string should not be parsed as a URL — schema rejects it.
  test("rejects empty string", () => {
    const result = ImageUrlSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  // A URL exceeding MAX_URL_LENGTH characters should fail with the urlTooLong message.
  test("rejects URL that exceeds MAX_URL_LENGTH", () => {
    const longUrl = "https://lh3.googleusercontent.com/" + "a".repeat(MAX_URL_LENGTH);
    const result = ImageUrlSchema.safeParse(longUrl);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("urlTooLong");
  });
});

describe("MAX_EXPORT_ROWS", () => {
  // The export row cap should be 10 000 — enough for any realistic HR dataset.
  test("is 10000", () => {
    expect(MAX_EXPORT_ROWS).toBe(10000);
  });
});
