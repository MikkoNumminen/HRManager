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
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_POSITION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  EmailSchema,
  TwoFactorSetupSchema,
  TwoFactorVerifySchema,
  CsvPersonImportRowSchema,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_FILE_SIZE,
  ReviewQuestionSchema,
  ReviewTemplateSchema,
  ReviewCycleSchema,
  ReviewRequestSchema,
  ReviewAnswerSchema,
  ReviewSubmissionSchema,
  TeamReviewRequestSchema,
  TeamReviewReportSchema,
  TeamReviewCycleSchema,
  MAX_LEAVE_NOTE_LENGTH,
  LeaveRequestStatusSchema,
  LeaveTypeSchema,
  LeaveRequestSchema,
  LeaveBalanceSchema,
  PositionSchema,
  EmployeeTeamSchema,
  EmployeeDepartmentSchema,
  EmployeeProfileSchema,
  OrgChartMemberSchema,
  OrgChartTeamSchema,
  OrgChartDepartmentSchema,
  OrgChartDataSchema,
  MAX_CONCURRENT_SESSIONS,
  UserSessionSchema,
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

// ── Shared constants ───────────────────────────────────────────────────────

describe("shared constants", () => {
  // These numeric caps are shared across all feature schemas — verify their values
  // so any accidental change is immediately caught.
  test("MAX_NAME_LENGTH is 255", () => {
    expect(MAX_NAME_LENGTH).toBe(255);
  });

  test("MAX_EMAIL_LENGTH is 320", () => {
    expect(MAX_EMAIL_LENGTH).toBe(320);
  });

  test("MAX_POSITION_LENGTH is 255", () => {
    expect(MAX_POSITION_LENGTH).toBe(255);
  });

  test("MAX_DESCRIPTION_LENGTH is 1000", () => {
    expect(MAX_DESCRIPTION_LENGTH).toBe(1000);
  });
});

describe("EmailSchema", () => {
  // A properly formatted email should parse without error.
  test("accepts a valid email", () => {
    expect(() => EmailSchema.parse("user@example.com")).not.toThrow();
  });

  // A string without @ is not a valid email.
  test("rejects invalid email format", () => {
    expect(() => EmailSchema.parse("not-an-email")).toThrow();
  });

  // Empty string should fail — an email requires at least local@domain.
  test("rejects empty string", () => {
    expect(() => EmailSchema.parse("")).toThrow();
  });

  // An email longer than MAX_EMAIL_LENGTH should be rejected.
  test("rejects email exceeding MAX_EMAIL_LENGTH", () => {
    const longEmail = "a".repeat(MAX_EMAIL_LENGTH) + "@example.com";
    expect(() => EmailSchema.parse(longEmail)).toThrow();
  });
});

// ── Two-Factor Authentication ──────────────────────────────────────────────

describe("TwoFactorSetupSchema", () => {
  const validSetup = {
    uri: "otpauth://totp/HRManager:user@example.com?secret=ABC&issuer=HRManager",
    secret: "JBSWY3DPEHPK3PXP",
    recoveryCodes: ["AAAA-BBBB", "CCCC-DDDD"],
  };

  // A complete 2FA setup payload should parse fine.
  test("accepts a valid 2FA setup payload", () => {
    expect(() => TwoFactorSetupSchema.parse(validSetup)).not.toThrow();
  });

  // Recovery codes can be an empty array (e.g., before generation).
  test("accepts empty recoveryCodes array", () => {
    const result = TwoFactorSetupSchema.parse({ ...validSetup, recoveryCodes: [] });
    expect(result.recoveryCodes).toEqual([]);
  });

  // Missing uri should fail.
  test("rejects missing uri", () => {
    const { uri: _, ...rest } = validSetup;
    expect(() => TwoFactorSetupSchema.parse(rest)).toThrow();
  });

  // Missing secret should fail.
  test("rejects missing secret", () => {
    const { secret: _, ...rest } = validSetup;
    expect(() => TwoFactorSetupSchema.parse(rest)).toThrow();
  });

  // recoveryCodes must be an array, not a string.
  test("rejects non-array recoveryCodes", () => {
    expect(() =>
      TwoFactorSetupSchema.parse({ ...validSetup, recoveryCodes: "AAAA-BBBB" }),
    ).toThrow();
  });
});

describe("TwoFactorVerifySchema", () => {
  // A 6-digit TOTP code is the standard format.
  test("accepts a 6-character code", () => {
    expect(() => TwoFactorVerifySchema.parse({ code: "123456" })).not.toThrow();
  });

  // Recovery codes have format XXXX-XXXX (9 chars including hyphen).
  test("accepts a 9-character recovery code", () => {
    expect(() => TwoFactorVerifySchema.parse({ code: "AAAA-BBBB" })).not.toThrow();
  });

  // A code shorter than 6 characters should be rejected.
  test("rejects code shorter than 6 characters", () => {
    expect(() => TwoFactorVerifySchema.parse({ code: "12345" })).toThrow();
  });

  // A code longer than 9 characters should be rejected.
  test("rejects code longer than 9 characters", () => {
    expect(() => TwoFactorVerifySchema.parse({ code: "1234567890" })).toThrow();
  });

  // Missing code field should fail.
  test("rejects missing code", () => {
    expect(() => TwoFactorVerifySchema.parse({})).toThrow();
  });
});

// ── Data Import/Export ─────────────────────────────────────────────────────

describe("MAX_IMPORT_ROWS", () => {
  // The import row limit should be 1000 — prevents oversized CSV uploads.
  test("is 1000", () => {
    expect(MAX_IMPORT_ROWS).toBe(1000);
  });
});

describe("MAX_IMPORT_FILE_SIZE", () => {
  // The import file size cap should be 1 MB (1024 * 1024 bytes).
  test("is 1 048 576 bytes (1 MB)", () => {
    expect(MAX_IMPORT_FILE_SIZE).toBe(1024 * 1024);
  });
});

describe("CsvPersonImportRowSchema", () => {
  const validRow = { name: "Alice", email: "alice@example.com", position: "Developer" };

  // A complete row with name, email, and position should parse fine.
  test("accepts a valid import row", () => {
    expect(() => CsvPersonImportRowSchema.parse(validRow)).not.toThrow();
  });

  // Position is optional — a row without it should still parse.
  test("accepts a row without position", () => {
    const { position: _, ...row } = validRow;
    expect(() => CsvPersonImportRowSchema.parse(row)).not.toThrow();
  });

  // Name is required and must be non-empty.
  test("rejects empty name", () => {
    expect(() => CsvPersonImportRowSchema.parse({ ...validRow, name: "" })).toThrow();
  });

  // Missing name field should fail.
  test("rejects missing name", () => {
    const { name: _, ...row } = validRow;
    expect(() => CsvPersonImportRowSchema.parse(row)).toThrow();
  });

  // Email must be a valid email format.
  test("rejects invalid email format", () => {
    expect(() => CsvPersonImportRowSchema.parse({ ...validRow, email: "not-email" })).toThrow();
  });

  // Missing email field should fail.
  test("rejects missing email", () => {
    const { email: _, ...row } = validRow;
    expect(() => CsvPersonImportRowSchema.parse(row)).toThrow();
  });
});

// ── Leave Management ───────────────────────────────────────────────────────

describe("MAX_LEAVE_NOTE_LENGTH", () => {
  // Leave notes are capped at 500 characters.
  test("is 500", () => {
    expect(MAX_LEAVE_NOTE_LENGTH).toBe(500);
  });
});

describe("LeaveRequestStatusSchema", () => {
  // All three valid statuses should be accepted.
  test("accepts PENDING", () => {
    expect(() => LeaveRequestStatusSchema.parse("PENDING")).not.toThrow();
  });

  test("accepts APPROVED", () => {
    expect(() => LeaveRequestStatusSchema.parse("APPROVED")).not.toThrow();
  });

  test("accepts REJECTED", () => {
    expect(() => LeaveRequestStatusSchema.parse("REJECTED")).not.toThrow();
  });

  // Made-up statuses should be rejected.
  test("rejects invalid status", () => {
    expect(() => LeaveRequestStatusSchema.parse("CANCELLED")).toThrow();
  });
});

describe("LeaveTypeSchema", () => {
  const validLeaveType = {
    id: VALID_UUID,
    name: "Annual Leave",
    description: "Standard annual leave entitlement",
    defaultDays: 20,
    color: "#4CAF50",
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A complete leave type should parse fine.
  test("accepts a valid leave type", () => {
    expect(() => LeaveTypeSchema.parse(validLeaveType)).not.toThrow();
  });

  // Description can be null (not all leave types have descriptions).
  test("accepts null description", () => {
    const result = LeaveTypeSchema.parse({ ...validLeaveType, description: null });
    expect(result.description).toBeNull();
  });

  // defaultDays must be a non-negative integer.
  test("rejects negative defaultDays", () => {
    expect(() => LeaveTypeSchema.parse({ ...validLeaveType, defaultDays: -1 })).toThrow();
  });

  // defaultDays must be an integer, not a float.
  test("rejects non-integer defaultDays", () => {
    expect(() => LeaveTypeSchema.parse({ ...validLeaveType, defaultDays: 2.5 })).toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => LeaveTypeSchema.parse({ ...validLeaveType, id: "bad-id" })).toThrow();
  });

  // name is required and must be non-empty.
  test("rejects empty name", () => {
    expect(() => LeaveTypeSchema.parse({ ...validLeaveType, name: "" })).toThrow();
  });
});

describe("LeaveRequestSchema", () => {
  const validRequest = {
    id: VALID_UUID,
    personId: VALID_UUID,
    personName: "Alice",
    leaveTypeId: VALID_UUID_2,
    leaveTypeName: "Annual Leave",
    leaveTypeColor: "#4CAF50",
    startDate: NOW,
    endDate: NOW,
    days: 5,
    note: "Vacation",
    status: "PENDING" as const,
    reviewerId: null,
    reviewerName: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: NOW,
  };

  // A fully valid leave request should parse fine.
  test("accepts a fully valid leave request", () => {
    expect(() => LeaveRequestSchema.parse(validRequest)).not.toThrow();
  });

  // All nullable fields can be null.
  test("accepts all nullable fields as null", () => {
    const result = LeaveRequestSchema.parse({ ...validRequest, note: null });
    expect(result.note).toBeNull();
  });

  // days must be at least 1 — zero-day leaves are not valid.
  test("rejects days less than 1", () => {
    expect(() => LeaveRequestSchema.parse({ ...validRequest, days: 0 })).toThrow();
  });

  // status must be one of the valid enum values.
  test("rejects invalid status", () => {
    expect(() => LeaveRequestSchema.parse({ ...validRequest, status: "CANCELLED" })).toThrow();
  });

  // personId must be a valid UUID.
  test("rejects invalid UUID for personId", () => {
    expect(() => LeaveRequestSchema.parse({ ...validRequest, personId: "bad" })).toThrow();
  });
});

describe("LeaveBalanceSchema", () => {
  const validBalance = {
    id: VALID_UUID,
    personId: VALID_UUID,
    personName: "Bob",
    leaveTypeId: VALID_UUID_2,
    leaveTypeName: "Annual Leave",
    leaveTypeColor: "#4CAF50",
    year: 2026,
    allocated: 20,
    used: 5,
    remaining: 15,
  };

  // A fully valid leave balance should parse fine.
  test("accepts a valid leave balance", () => {
    expect(() => LeaveBalanceSchema.parse(validBalance)).not.toThrow();
  });

  // allocated must be a non-negative integer.
  test("rejects negative allocated", () => {
    expect(() => LeaveBalanceSchema.parse({ ...validBalance, allocated: -1 })).toThrow();
  });

  // used must be a non-negative integer.
  test("rejects negative used", () => {
    expect(() => LeaveBalanceSchema.parse({ ...validBalance, used: -1 })).toThrow();
  });

  // year must be an integer.
  test("rejects non-integer year", () => {
    expect(() => LeaveBalanceSchema.parse({ ...validBalance, year: 2026.5 })).toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => LeaveBalanceSchema.parse({ ...validBalance, id: "not-uuid" })).toThrow();
  });
});

// ── Positions ──────────────────────────────────────────────────────────────

describe("PositionSchema", () => {
  const validPosition = {
    id: VALID_UUID,
    name: "Senior Developer",
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A fully valid position should parse fine.
  test("accepts a valid position", () => {
    expect(() => PositionSchema.parse(validPosition)).not.toThrow();
  });

  // name must be non-empty.
  test("rejects empty name", () => {
    expect(() => PositionSchema.parse({ ...validPosition, name: "" })).toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => PositionSchema.parse({ ...validPosition, id: "bad" })).toThrow();
  });

  // Timestamps must be Date objects.
  test("rejects non-date createdAt", () => {
    expect(() => PositionSchema.parse({ ...validPosition, createdAt: "2026-01-01" })).toThrow();
  });

  // All fields are preserved after parsing.
  test("preserves all fields after parsing", () => {
    const result = PositionSchema.parse(validPosition);
    expect(result).toEqual(validPosition);
  });
});

// ── Employee Profile ───────────────────────────────────────────────────────

describe("EmployeeTeamSchema", () => {
  // A valid employee team reference should parse fine.
  test("accepts a valid employee team", () => {
    expect(() =>
      EmployeeTeamSchema.parse({ teamId: VALID_UUID, teamName: "Engineering" }),
    ).not.toThrow();
  });

  // teamId must be a valid UUID.
  test("rejects invalid UUID for teamId", () => {
    expect(() => EmployeeTeamSchema.parse({ teamId: "bad", teamName: "Eng" })).toThrow();
  });

  // teamName is required.
  test("rejects missing teamName", () => {
    expect(() => EmployeeTeamSchema.parse({ teamId: VALID_UUID })).toThrow();
  });
});

describe("EmployeeDepartmentSchema", () => {
  // A valid employee department reference should parse fine.
  test("accepts a valid employee department", () => {
    expect(() => EmployeeDepartmentSchema.parse({ id: VALID_UUID, name: "Product" })).not.toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => EmployeeDepartmentSchema.parse({ id: "bad", name: "Product" })).toThrow();
  });
});

describe("EmployeeProfileSchema", () => {
  const validProfile = {
    id: VALID_UUID,
    name: "Alice",
    position: "Engineer",
    email: "alice@example.com",
    createdAt: NOW,
    updatedAt: NOW,
    teams: [{ teamId: VALID_UUID, teamName: "Alpha" }],
    managedTeams: [],
    headOfDepartments: [],
  };

  // A complete employee profile should parse fine.
  test("accepts a fully valid employee profile", () => {
    expect(() => EmployeeProfileSchema.parse(validProfile)).not.toThrow();
  });

  // position and email can be null.
  test("accepts null position and email", () => {
    const result = EmployeeProfileSchema.parse({ ...validProfile, position: null, email: null });
    expect(result.position).toBeNull();
    expect(result.email).toBeNull();
  });

  // Teams, managedTeams, and headOfDepartments can all be empty arrays.
  test("accepts all empty arrays for teams fields", () => {
    const result = EmployeeProfileSchema.parse({
      ...validProfile,
      teams: [],
      managedTeams: [],
      headOfDepartments: [],
    });
    expect(result.teams).toEqual([]);
    expect(result.managedTeams).toEqual([]);
    expect(result.headOfDepartments).toEqual([]);
  });

  // name must be non-empty.
  test("rejects empty name", () => {
    expect(() => EmployeeProfileSchema.parse({ ...validProfile, name: "" })).toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => EmployeeProfileSchema.parse({ ...validProfile, id: "bad" })).toThrow();
  });

  // email must be a valid email format when non-null.
  test("rejects invalid email format", () => {
    expect(() => EmployeeProfileSchema.parse({ ...validProfile, email: "not-an-email" })).toThrow();
  });
});

// ── Reviews ────────────────────────────────────────────────────────────────

describe("ReviewQuestionSchema", () => {
  const validQuestion = {
    id: VALID_UUID,
    text: "How would you rate your performance?",
    type: "RATING" as const,
    scaleMin: 1,
    scaleMax: 5,
    order: 0,
    required: true,
  };

  // A complete rating question should parse fine.
  test("accepts a valid RATING question", () => {
    expect(() => ReviewQuestionSchema.parse(validQuestion)).not.toThrow();
  });

  // TEXT type questions should also be accepted.
  test("accepts a valid TEXT question", () => {
    const q = { ...validQuestion, type: "TEXT" as const, scaleMin: null, scaleMax: null };
    expect(() => ReviewQuestionSchema.parse(q)).not.toThrow();
  });

  // scaleMin and scaleMax can be null for TEXT questions.
  test("accepts null scaleMin and scaleMax", () => {
    const result = ReviewQuestionSchema.parse({ ...validQuestion, scaleMin: null, scaleMax: null });
    expect(result.scaleMin).toBeNull();
    expect(result.scaleMax).toBeNull();
  });

  // type must be one of the valid enum values.
  test("rejects invalid type", () => {
    expect(() => ReviewQuestionSchema.parse({ ...validQuestion, type: "CHECKBOX" })).toThrow();
  });

  // text must be non-empty.
  test("rejects empty text", () => {
    expect(() => ReviewQuestionSchema.parse({ ...validQuestion, text: "" })).toThrow();
  });

  // order must be a non-negative integer.
  test("rejects negative order", () => {
    expect(() => ReviewQuestionSchema.parse({ ...validQuestion, order: -1 })).toThrow();
  });

  // scaleMin must be within 1–5 when non-null.
  test("rejects scaleMin below 1", () => {
    expect(() => ReviewQuestionSchema.parse({ ...validQuestion, scaleMin: 0 })).toThrow();
  });

  // scaleMax must be within 2–10 when non-null.
  test("rejects scaleMax above 10", () => {
    expect(() => ReviewQuestionSchema.parse({ ...validQuestion, scaleMax: 11 })).toThrow();
  });
});

describe("ReviewTemplateSchema", () => {
  const validTemplate = {
    id: VALID_UUID,
    name: "Annual Review",
    description: "Used for annual performance reviews",
    questions: [],
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A complete template with no questions should parse fine.
  test("accepts a valid review template with no questions", () => {
    expect(() => ReviewTemplateSchema.parse(validTemplate)).not.toThrow();
  });

  // description can be null.
  test("accepts null description", () => {
    const result = ReviewTemplateSchema.parse({ ...validTemplate, description: null });
    expect(result.description).toBeNull();
  });

  // name must be non-empty.
  test("rejects empty name", () => {
    expect(() => ReviewTemplateSchema.parse({ ...validTemplate, name: "" })).toThrow();
  });

  // questions must be an array (even if empty).
  test("rejects missing questions array", () => {
    const { questions: _, ...rest } = validTemplate;
    expect(() => ReviewTemplateSchema.parse(rest)).toThrow();
  });
});

describe("ReviewCycleSchema", () => {
  const validCycle = {
    id: VALID_UUID,
    name: "Q1 2026",
    templateId: VALID_UUID_2,
    templateName: "Annual Review",
    status: "DRAFT" as const,
    startDate: NOW,
    endDate: NOW,
    requestCount: 10,
    submittedCount: 3,
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A complete review cycle should parse fine.
  test("accepts a fully valid review cycle", () => {
    expect(() => ReviewCycleSchema.parse(validCycle)).not.toThrow();
  });

  // templateId and templateName can be null (no template assigned yet).
  test("accepts null templateId and templateName", () => {
    const result = ReviewCycleSchema.parse({
      ...validCycle,
      templateId: null,
      templateName: null,
    });
    expect(result.templateId).toBeNull();
    expect(result.templateName).toBeNull();
  });

  // All three valid cycle statuses should be accepted.
  test("accepts OPEN and CLOSED statuses", () => {
    expect(() => ReviewCycleSchema.parse({ ...validCycle, status: "OPEN" })).not.toThrow();
    expect(() => ReviewCycleSchema.parse({ ...validCycle, status: "CLOSED" })).not.toThrow();
  });

  // Invalid status should be rejected.
  test("rejects invalid status", () => {
    expect(() => ReviewCycleSchema.parse({ ...validCycle, status: "ARCHIVED" })).toThrow();
  });

  // name must be non-empty.
  test("rejects empty name", () => {
    expect(() => ReviewCycleSchema.parse({ ...validCycle, name: "" })).toThrow();
  });
});

describe("ReviewRequestSchema", () => {
  const validReviewRequest = {
    id: VALID_UUID,
    cycleId: VALID_UUID,
    cycleName: "Q1 2026",
    cycleStatus: "OPEN" as const,
    subjectId: VALID_UUID_2,
    subjectName: "Alice",
    reviewerId: VALID_UUID,
    reviewerName: "Bob",
    type: "PEER" as const,
    status: "PENDING" as const,
    createdAt: NOW,
  };

  // A fully valid review request should parse fine.
  test("accepts a fully valid review request", () => {
    expect(() => ReviewRequestSchema.parse(validReviewRequest)).not.toThrow();
  });

  // subjectId, subjectName, reviewerId, reviewerName can all be null.
  test("accepts null subject and reviewer fields", () => {
    const result = ReviewRequestSchema.parse({
      ...validReviewRequest,
      subjectId: null,
      subjectName: null,
      reviewerId: null,
      reviewerName: null,
    });
    expect(result.subjectId).toBeNull();
    expect(result.reviewerId).toBeNull();
  });

  // All four review types should be accepted.
  test("accepts all four type values", () => {
    for (const type of ["SELF", "MANAGER", "PEER", "DIRECT_REPORT"]) {
      expect(() => ReviewRequestSchema.parse({ ...validReviewRequest, type })).not.toThrow();
    }
  });

  // Invalid type should be rejected.
  test("rejects invalid type", () => {
    expect(() => ReviewRequestSchema.parse({ ...validReviewRequest, type: "COLLEAGUE" })).toThrow();
  });

  // SUBMITTED status should also be accepted.
  test("accepts SUBMITTED status", () => {
    expect(() =>
      ReviewRequestSchema.parse({ ...validReviewRequest, status: "SUBMITTED" }),
    ).not.toThrow();
  });
});

describe("ReviewAnswerSchema", () => {
  // A rating answer with a valid ratingValue should parse fine.
  test("accepts a valid rating answer", () => {
    expect(() =>
      ReviewAnswerSchema.parse({ questionId: VALID_UUID, ratingValue: 5, textValue: null }),
    ).not.toThrow();
  });

  // A text answer with a textValue and null ratingValue should parse fine.
  test("accepts a valid text answer", () => {
    expect(() =>
      ReviewAnswerSchema.parse({
        questionId: VALID_UUID,
        ratingValue: null,
        textValue: "Great work",
      }),
    ).not.toThrow();
  });

  // Both ratingValue and textValue can be null.
  test("accepts null ratingValue and textValue", () => {
    const result = ReviewAnswerSchema.parse({
      questionId: VALID_UUID,
      ratingValue: null,
      textValue: null,
    });
    expect(result.ratingValue).toBeNull();
    expect(result.textValue).toBeNull();
  });

  // ratingValue must be between 1 and 10 when non-null.
  test("rejects ratingValue below 1", () => {
    expect(() =>
      ReviewAnswerSchema.parse({ questionId: VALID_UUID, ratingValue: 0, textValue: null }),
    ).toThrow();
  });

  test("rejects ratingValue above 10", () => {
    expect(() =>
      ReviewAnswerSchema.parse({ questionId: VALID_UUID, ratingValue: 11, textValue: null }),
    ).toThrow();
  });

  // questionId must be a valid UUID.
  test("rejects invalid UUID for questionId", () => {
    expect(() =>
      ReviewAnswerSchema.parse({ questionId: "bad", ratingValue: null, textValue: null }),
    ).toThrow();
  });
});

describe("ReviewSubmissionSchema", () => {
  const validSubmission = {
    id: VALID_UUID,
    requestId: VALID_UUID_2,
    answers: [{ questionId: VALID_UUID, ratingValue: 7, textValue: null }],
    submittedAt: NOW,
  };

  // A fully valid submission should parse fine.
  test("accepts a fully valid submission", () => {
    expect(() => ReviewSubmissionSchema.parse(validSubmission)).not.toThrow();
  });

  // answers can be an empty array.
  test("accepts empty answers array", () => {
    const result = ReviewSubmissionSchema.parse({ ...validSubmission, answers: [] });
    expect(result.answers).toEqual([]);
  });

  // submittedAt must be a Date.
  test("rejects non-date submittedAt", () => {
    expect(() =>
      ReviewSubmissionSchema.parse({ ...validSubmission, submittedAt: "yesterday" }),
    ).toThrow();
  });
});

describe("TeamReviewRequestSchema", () => {
  const validReq = {
    id: VALID_UUID,
    type: "PEER",
    status: "PENDING",
    reviewerId: VALID_UUID_2,
    reviewerName: "Alice",
  };

  // A fully valid team review request should parse fine.
  test("accepts a valid team review request", () => {
    expect(() => TeamReviewRequestSchema.parse(validReq)).not.toThrow();
  });

  // reviewerId and reviewerName can be null.
  test("accepts null reviewerId and reviewerName", () => {
    const result = TeamReviewRequestSchema.parse({
      ...validReq,
      reviewerId: null,
      reviewerName: null,
    });
    expect(result.reviewerId).toBeNull();
    expect(result.reviewerName).toBeNull();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => TeamReviewRequestSchema.parse({ ...validReq, id: "bad" })).toThrow();
  });
});

describe("TeamReviewReportSchema", () => {
  const validReport = {
    subjectId: VALID_UUID,
    subjectName: "Bob",
    requests: [
      { id: VALID_UUID_2, type: "PEER", status: "PENDING", reviewerId: null, reviewerName: null },
    ],
  };

  // A fully valid team review report should parse fine.
  test("accepts a valid team review report", () => {
    expect(() => TeamReviewReportSchema.parse(validReport)).not.toThrow();
  });

  // requests can be an empty array.
  test("accepts empty requests array", () => {
    const result = TeamReviewReportSchema.parse({ ...validReport, requests: [] });
    expect(result.requests).toEqual([]);
  });

  // subjectId must be a valid UUID.
  test("rejects invalid UUID for subjectId", () => {
    expect(() => TeamReviewReportSchema.parse({ ...validReport, subjectId: "bad" })).toThrow();
  });
});

describe("TeamReviewCycleSchema", () => {
  const validCycle = {
    cycleId: VALID_UUID,
    cycleName: "Q1 2026",
    cycleStatus: "OPEN" as const,
    reports: [],
  };

  // A fully valid team review cycle should parse fine.
  test("accepts a valid team review cycle", () => {
    expect(() => TeamReviewCycleSchema.parse(validCycle)).not.toThrow();
  });

  // All three cycle statuses should be accepted.
  test("accepts DRAFT and CLOSED statuses", () => {
    expect(() =>
      TeamReviewCycleSchema.parse({ ...validCycle, cycleStatus: "DRAFT" }),
    ).not.toThrow();
    expect(() =>
      TeamReviewCycleSchema.parse({ ...validCycle, cycleStatus: "CLOSED" }),
    ).not.toThrow();
  });

  // Invalid cycleStatus should be rejected.
  test("rejects invalid cycleStatus", () => {
    expect(() => TeamReviewCycleSchema.parse({ ...validCycle, cycleStatus: "ARCHIVED" })).toThrow();
  });

  // cycleId must be a valid UUID.
  test("rejects invalid UUID for cycleId", () => {
    expect(() => TeamReviewCycleSchema.parse({ ...validCycle, cycleId: "bad" })).toThrow();
  });
});

// ── Org Chart ──────────────────────────────────────────────────────────────

describe("OrgChartMemberSchema", () => {
  const validMember = {
    id: VALID_UUID,
    name: "Alice",
    position: "Engineer",
    email: "alice@example.com",
  };

  // A complete org chart member should parse fine.
  test("accepts a valid org chart member", () => {
    expect(() => OrgChartMemberSchema.parse(validMember)).not.toThrow();
  });

  // position and email can be null.
  test("accepts null position and email", () => {
    const result = OrgChartMemberSchema.parse({ ...validMember, position: null, email: null });
    expect(result.position).toBeNull();
    expect(result.email).toBeNull();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => OrgChartMemberSchema.parse({ ...validMember, id: "bad" })).toThrow();
  });
});

describe("OrgChartTeamSchema", () => {
  const validTeam = {
    teamId: VALID_UUID,
    teamName: "Platform",
    managerId: VALID_UUID_2,
    managerName: "Bob",
    members: [{ id: VALID_UUID, name: "Alice", position: null, email: null }],
  };

  // A complete org chart team should parse fine.
  test("accepts a valid org chart team", () => {
    expect(() => OrgChartTeamSchema.parse(validTeam)).not.toThrow();
  });

  // managerId and managerName can be null (no manager assigned).
  test("accepts null managerId and managerName", () => {
    const result = OrgChartTeamSchema.parse({ ...validTeam, managerId: null, managerName: null });
    expect(result.managerId).toBeNull();
    expect(result.managerName).toBeNull();
  });

  // members can be an empty array.
  test("accepts empty members array", () => {
    const result = OrgChartTeamSchema.parse({ ...validTeam, members: [] });
    expect(result.members).toEqual([]);
  });

  // teamId must be a valid UUID.
  test("rejects invalid UUID for teamId", () => {
    expect(() => OrgChartTeamSchema.parse({ ...validTeam, teamId: "bad" })).toThrow();
  });
});

describe("OrgChartDepartmentSchema", () => {
  const validDept = {
    id: VALID_UUID,
    name: "Engineering",
    headId: VALID_UUID_2,
    headName: "Alice",
    teams: [],
  };

  // A complete org chart department should parse fine.
  test("accepts a valid org chart department", () => {
    expect(() => OrgChartDepartmentSchema.parse(validDept)).not.toThrow();
  });

  // headId and headName can be null.
  test("accepts null headId and headName", () => {
    const result = OrgChartDepartmentSchema.parse({ ...validDept, headId: null, headName: null });
    expect(result.headId).toBeNull();
    expect(result.headName).toBeNull();
  });

  // teams can be an empty array.
  test("accepts empty teams array", () => {
    const result = OrgChartDepartmentSchema.parse({ ...validDept, teams: [] });
    expect(result.teams).toEqual([]);
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => OrgChartDepartmentSchema.parse({ ...validDept, id: "bad" })).toThrow();
  });
});

describe("OrgChartDataSchema", () => {
  const validData = {
    departments: [],
    unassignedTeams: [],
    unassignedPersons: [],
  };

  // An empty org chart (no departments or teams) should parse fine.
  test("accepts empty org chart data", () => {
    expect(() => OrgChartDataSchema.parse(validData)).not.toThrow();
  });

  // departments, unassignedTeams, and unassignedPersons are all required arrays.
  test("rejects missing departments field", () => {
    const { departments: _, ...rest } = validData;
    expect(() => OrgChartDataSchema.parse(rest)).toThrow();
  });

  test("rejects missing unassignedTeams field", () => {
    const { unassignedTeams: _, ...rest } = validData;
    expect(() => OrgChartDataSchema.parse(rest)).toThrow();
  });

  test("rejects missing unassignedPersons field", () => {
    const { unassignedPersons: _, ...rest } = validData;
    expect(() => OrgChartDataSchema.parse(rest)).toThrow();
  });
});

// ── Sessions ───────────────────────────────────────────────────────────────

describe("MAX_CONCURRENT_SESSIONS", () => {
  // The session concurrency limit should be 5.
  test("is 5", () => {
    expect(MAX_CONCURRENT_SESSIONS).toBe(5);
  });
});

describe("UserSessionSchema", () => {
  const validSession = {
    id: VALID_UUID,
    userId: VALID_UUID_2,
    userAgent: "Mozilla/5.0",
    ipAddress: "127.0.0.1",
    active: true,
    lastActiveAt: NOW,
    createdAt: NOW,
  };

  // A fully valid session should parse fine.
  test("accepts a fully valid session", () => {
    expect(() => UserSessionSchema.parse(validSession)).not.toThrow();
  });

  // userAgent and ipAddress can be null.
  test("accepts null userAgent and ipAddress", () => {
    const result = UserSessionSchema.parse({ ...validSession, userAgent: null, ipAddress: null });
    expect(result.userAgent).toBeNull();
    expect(result.ipAddress).toBeNull();
  });

  // active must be a boolean.
  test("rejects non-boolean active", () => {
    expect(() => UserSessionSchema.parse({ ...validSession, active: "yes" })).toThrow();
  });

  // lastActiveAt must be a Date.
  test("rejects non-date lastActiveAt", () => {
    expect(() => UserSessionSchema.parse({ ...validSession, lastActiveAt: "yesterday" })).toThrow();
  });

  // id must be a valid UUID.
  test("rejects invalid UUID for id", () => {
    expect(() => UserSessionSchema.parse({ ...validSession, id: "bad" })).toThrow();
  });

  // userId must be a valid UUID.
  test("rejects invalid UUID for userId", () => {
    expect(() => UserSessionSchema.parse({ ...validSession, userId: "bad" })).toThrow();
  });

  // All fields are preserved after parsing.
  test("preserves all fields after parsing", () => {
    const result = UserSessionSchema.parse(validSession);
    expect(result).toEqual(validSession);
  });
});
