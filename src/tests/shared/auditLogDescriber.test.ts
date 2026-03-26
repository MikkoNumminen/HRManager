import { describeChanges } from "@/utils/auditLogDescriber";

// Helper to build a minimal translate function that returns "key(params)" for inspection
const makeT =
  (prefix = "") =>
  (key: string, params?: Record<string, string>) => {
    if (!params) return `${prefix}${key}`;
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${prefix}${key}(${paramStr})`;
  };

const t = makeT();
const tc = makeT("c:");
const permissionLabels: Record<string, string> = {
  "person:create": "Create Person",
  "team:manage": "Manage Teams",
};
const userNames: Record<string, string> = {
  "alice@example.com": "Alice Smith",
};

// Helper to call describeChanges with common defaults
function describe_changes(
  opts: Partial<Parameters<typeof describeChanges>[0]> & {
    action: string;
    entityType: string;
  },
): string {
  return describeChanges({
    before: null,
    after: null,
    t,
    tc,
    permissionLabels,
    userNames,
    ...opts,
  });
}

describe("describeChanges — create actions", () => {
  // create person uses name from after
  test("create person with name", () => {
    const result = describe_changes({
      action: "create",
      entityType: "person",
      after: JSON.stringify({ name: "Bob" }),
    });
    expect(result).toContain("addedPerson");
    expect(result).toContain("Bob");
  });

  // create person with no after data falls back to 'unknown'
  test("create person with no after falls back to unknown", () => {
    const result = describe_changes({
      action: "create",
      entityType: "person",
      after: null,
    });
    expect(result).toContain("addedPerson");
    expect(result).toContain("c:unknown");
  });

  // create team uses teamName from after
  test("create team with teamName", () => {
    const result = describe_changes({
      action: "create",
      entityType: "team",
      after: JSON.stringify({ teamName: "Platform" }),
    });
    expect(result).toContain("createdTeam");
    expect(result).toContain("Platform");
  });

  // create team with no teamName falls back to unknown
  test("create team with no teamName falls back to unknown", () => {
    const result = describe_changes({
      action: "create",
      entityType: "team",
      after: JSON.stringify({}),
    });
    expect(result).toContain("createdTeam");
    expect(result).toContain("c:unknown");
  });

  // create teamMember returns the fixed key
  test("create teamMember returns addedMember", () => {
    expect(describe_changes({ action: "create", entityType: "teamMember" })).toContain(
      "addedMember",
    );
  });

  // create department uses name from after
  test("create department with name", () => {
    const result = describe_changes({
      action: "create",
      entityType: "department",
      after: JSON.stringify({ name: "Engineering" }),
    });
    expect(result).toContain("createdDepartment");
    expect(result).toContain("Engineering");
  });

  // create unknown entity type falls back to newRecord
  test("create unknown entity type returns newRecord", () => {
    const result = describe_changes({ action: "create", entityType: "unknown_entity" });
    expect(result).toContain("newRecord");
  });
});

describe("describeChanges — delete actions", () => {
  // delete person uses name and email from before
  test("delete person with before data", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "person",
      before: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
    });
    expect(result).toContain("removedPerson");
    expect(result).toContain("Alice");
  });

  // delete person with no before falls back to unknown
  test("delete person with no before falls back to unknown", () => {
    const result = describe_changes({ action: "delete", entityType: "person", before: null });
    expect(result).toContain("removedPerson");
    expect(result).toContain("c:unknown");
  });

  // delete team uses teamName from before
  test("delete team with teamName", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "team",
      before: JSON.stringify({ teamName: "Alpha" }),
    });
    expect(result).toContain("deletedTeam");
    expect(result).toContain("Alpha");
  });

  // delete team with no teamName falls back to unknown
  test("delete team with no before data", () => {
    const result = describe_changes({ action: "delete", entityType: "team", before: null });
    expect(result).toContain("deletedTeam");
    expect(result).toContain("c:unknown");
  });

  // delete teamMember returns removedMember
  test("delete teamMember returns removedMember", () => {
    const result = describe_changes({ action: "delete", entityType: "teamMember" });
    expect(result).toContain("removedMember");
  });

  // delete department uses name from before
  test("delete department with name", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "department",
      before: JSON.stringify({ name: "Marketing" }),
    });
    expect(result).toContain("deletedDepartment");
    expect(result).toContain("Marketing");
  });

  // delete userPermission resolves label from permissionLabels map
  test("delete userPermission with known permissionKey uses label", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "userPermission",
      before: JSON.stringify({ permissionKey: "person:create", targetEmail: "alice@example.com" }),
    });
    expect(result).toContain("resetPermission");
    expect(result).toContain("Create Person");
    expect(result).toContain("Alice Smith"); // resolved via userNames
  });

  // delete userPermission with unknown key uses the raw key
  test("delete userPermission with unknown permissionKey uses raw key", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "userPermission",
      before: JSON.stringify({ permissionKey: "unknown:perm", targetEmail: "other@example.com" }),
    });
    expect(result).toContain("resetPermission");
    expect(result).toContain("unknown:perm");
    // email not in userNames — falls back to the email itself
    expect(result).toContain("other@example.com");
  });

  // delete userPermission with no email falls back to unknown for target
  test("delete userPermission with no targetEmail falls back to unknown", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "userPermission",
      before: JSON.stringify({ permissionKey: "person:create" }),
    });
    expect(result).toContain("resetPermission");
    expect(result).toContain("c:unknown");
  });

  // delete unknown entity type falls back to recordDeleted
  test("delete unknown entity type returns recordDeleted", () => {
    const result = describe_changes({ action: "delete", entityType: "unknown_entity" });
    expect(result).toContain("recordDeleted");
  });
});

describe("describeChanges — kickout actions", () => {
  // kickout user describes which user was kicked
  test("kickout user returns kickedOutUser", () => {
    const result = describe_changes({
      action: "kickout",
      entityType: "user",
      before: JSON.stringify({ name: "Bob", email: "bob@example.com", role: "guest" }),
    });
    expect(result).toContain("kickedOutUser");
    expect(result).toContain("Bob");
  });

  // kickout user with no before data fills in empty values
  test("kickout user with no before fills empty name/email/role", () => {
    const result = describe_changes({
      action: "kickout",
      entityType: "user",
      before: null,
    });
    expect(result).toContain("kickedOutUser");
    expect(result).toContain("c:unknown");
  });

  // kickout non-user entity falls back to recordDeleted
  test("kickout non-user entity returns recordDeleted", () => {
    const result = describe_changes({ action: "kickout", entityType: "team" });
    expect(result).toContain("recordDeleted");
  });
});

describe("describeChanges — update actions", () => {
  // update person name change
  test("update person name returns changedName", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ name: "Alice" }),
      after: JSON.stringify({ name: "Alicia" }),
    });
    expect(result).toContain("changedName");
    expect(result).toContain("Alice");
    expect(result).toContain("Alicia");
  });

  // update person position change
  test("update person position returns changedPosition", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ position: "Dev" }),
      after: JSON.stringify({ position: "Senior Dev" }),
    });
    expect(result).toContain("changedPosition");
    expect(result).toContain("Dev");
    expect(result).toContain("Senior Dev");
  });

  // update person email change
  test("update person email returns changedEmail", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ email: "old@test.com" }),
      after: JSON.stringify({ email: "new@test.com" }),
    });
    expect(result).toContain("changedEmail");
    expect(result).toContain("old@test.com");
    expect(result).toContain("new@test.com");
  });

  // update person with no specific field change falls back to updatedPerson
  test("update person with no recognized field returns updatedPerson", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ image: "old.png" }),
      after: JSON.stringify({ image: "new.png" }),
    });
    expect(result).toContain("updatedPerson");
  });

  // update person: name present in after but same as before — no name change detected
  test("update person when name unchanged returns updatedPerson", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ name: "Alice" }),
      after: JSON.stringify({ name: "Alice" }),
    });
    expect(result).toContain("updatedPerson");
  });

  // update team name change
  test("update team name returns renamedTeam", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ teamName: "Old" }),
      after: JSON.stringify({ teamName: "New" }),
    });
    expect(result).toContain("renamedTeam");
  });

  // update team with same name and other field falls through to next checks
  test("update team when teamName is unchanged checks next conditions", () => {
    // departmentId set to null → removedTeamFromDept
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ teamName: "Same", departmentId: "some-id" }),
      after: JSON.stringify({ teamName: "Same", departmentId: null }),
    });
    expect(result).toContain("removedTeamFromDept");
  });

  // update team departmentId to a real value → assignedTeamToDept
  test("update team with non-null departmentId returns assignedTeamToDept", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({}),
      after: JSON.stringify({ departmentId: "dept-uuid" }),
    });
    expect(result).toContain("assignedTeamToDept");
  });

  // update team teamManagerId set to null → removedManager
  test("update team with teamManagerId=null returns removedManager", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ teamManagerId: "some-id" }),
      after: JSON.stringify({ teamManagerId: null }),
    });
    expect(result).toContain("removedManager");
  });

  // update team teamManagerId set to a value → changedManager
  test("update team with non-null teamManagerId returns changedManager", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({}),
      after: JSON.stringify({ teamManagerId: "mgr-uuid" }),
    });
    expect(result).toContain("changedManager");
  });

  // update team with no recognized field returns updatedTeam
  test("update team with no recognized field returns updatedTeam", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ color: "blue" }),
      after: JSON.stringify({ color: "red" }),
    });
    expect(result).toContain("updatedTeam");
  });

  // update department headId set to null → removedHead
  test("update department with headId=null returns removedHead", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({ headId: "some-id" }),
      after: JSON.stringify({ headId: null }),
    });
    expect(result).toContain("removedHead");
  });

  // update department headId set to a value → changedHead
  test("update department with non-null headId returns changedHead", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({}),
      after: JSON.stringify({ headId: "new-head-uuid" }),
    });
    expect(result).toContain("changedHead");
  });

  // update department name change → renamedDepartment
  test("update department with name change returns renamedDepartment", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({ name: "OldDept" }),
      after: JSON.stringify({ name: "NewDept" }),
    });
    expect(result).toContain("renamedDepartment");
    expect(result).toContain("OldDept");
    expect(result).toContain("NewDept");
  });

  // update department with no recognized field → updatedDepartment
  test("update department with no recognized field returns updatedDepartment", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({ description: "old" }),
      after: JSON.stringify({ description: "new" }),
    });
    expect(result).toContain("updatedDepartment");
  });

  // update user (role change) resolves target via userNames
  test("update user returns changedRole with resolved name", () => {
    const result = describe_changes({
      action: "update",
      entityType: "user",
      before: JSON.stringify({ role: "user", targetEmail: "alice@example.com" }),
      after: JSON.stringify({ role: "administrator", targetEmail: "alice@example.com" }),
    });
    expect(result).toContain("changedRole");
    expect(result).toContain("Alice Smith");
    expect(result).toContain("user");
    expect(result).toContain("administrator");
  });

  // update user when email not in userNames falls back to the email itself
  test("update user target not in userNames uses email as fallback", () => {
    const result = describe_changes({
      action: "update",
      entityType: "user",
      before: JSON.stringify({ role: "guest", targetEmail: "unknown@test.com" }),
      after: JSON.stringify({ role: "user", targetEmail: "unknown@test.com" }),
    });
    expect(result).toContain("changedRole");
    expect(result).toContain("unknown@test.com");
  });

  // update userPermission granted=true → grantedPermission
  test("update userPermission granted=true returns grantedPermission", () => {
    const result = describe_changes({
      action: "update",
      entityType: "userPermission",
      before: JSON.stringify({ granted: false, permissionKey: "person:create" }),
      after: JSON.stringify({
        granted: true,
        permissionKey: "person:create",
        targetEmail: "alice@example.com",
      }),
    });
    expect(result).toContain("grantedPermission");
    expect(result).toContain("Create Person");
    expect(result).toContain("Alice Smith");
  });

  // update userPermission granted=false → revokedPermission
  test("update userPermission granted=false returns revokedPermission", () => {
    const result = describe_changes({
      action: "update",
      entityType: "userPermission",
      before: JSON.stringify({ granted: true, permissionKey: "team:manage" }),
      after: JSON.stringify({
        granted: false,
        permissionKey: "team:manage",
        targetEmail: "alice@example.com",
      }),
    });
    expect(result).toContain("revokedPermission");
    expect(result).toContain("Manage Teams");
  });

  // update userPermission with unknown key uses raw key
  test("update userPermission with unknown key uses raw key as label", () => {
    const result = describe_changes({
      action: "update",
      entityType: "userPermission",
      before: JSON.stringify({ granted: false }),
      after: JSON.stringify({
        granted: true,
        permissionKey: "custom:perm",
        targetEmail: "alice@example.com",
      }),
    });
    expect(result).toContain("grantedPermission");
    expect(result).toContain("custom:perm");
  });

  // update unknown entity type returns recordUpdated
  test("update unknown entity type returns recordUpdated", () => {
    const result = describe_changes({
      action: "update",
      entityType: "unknown_entity",
      before: JSON.stringify({}),
      after: JSON.stringify({}),
    });
    expect(result).toContain("recordUpdated");
  });
});

describe("describeChanges — seed action", () => {
  // seed with clearExisting=true in before returns seedReplaced
  test("seed with clearExisting=true in before returns seedReplaced", () => {
    const result = describe_changes({
      action: "seed",
      entityType: "person",
      before: JSON.stringify({ clearExisting: true }),
    });
    expect(result).toContain("seedReplaced");
  });

  // seed with clearExisting=true in after returns seedReplaced
  test("seed with clearExisting=true in after returns seedReplaced", () => {
    const result = describe_changes({
      action: "seed",
      entityType: "person",
      after: JSON.stringify({ clearExisting: true }),
    });
    expect(result).toContain("seedReplaced");
  });

  // seed with clearExisting=false returns seedKept
  test("seed with clearExisting=false returns seedKept", () => {
    const result = describe_changes({
      action: "seed",
      entityType: "person",
      before: JSON.stringify({ clearExisting: false }),
      after: JSON.stringify({ clearExisting: false }),
    });
    expect(result).toContain("seedKept");
  });

  // seed with no data (both null) returns seedKept (falsy clearExisting)
  test("seed with no data returns seedKept", () => {
    const result = describe_changes({ action: "seed", entityType: "person" });
    expect(result).toContain("seedKept");
  });
});

describe("describeChanges — reset action", () => {
  // reset with personCount/teamCount/departmentCount in before
  test("reset uses personCount/teamCount/departmentCount from before", () => {
    const result = describe_changes({
      action: "reset",
      entityType: "person",
      before: JSON.stringify({ personCount: 10, teamCount: 3, departmentCount: 2 }),
    });
    expect(result).toContain("clearedData");
    expect(result).toContain("persons=10");
    expect(result).toContain("teams=3");
    expect(result).toContain("departments=2");
  });

  // reset falls back to 'persons/teams/departments' keys if 'count' keys missing
  test("reset falls back to persons/teams/departments keys", () => {
    const result = describe_changes({
      action: "reset",
      entityType: "person",
      before: JSON.stringify({ persons: 5, teams: 1, departments: 1 }),
    });
    expect(result).toContain("clearedData");
    expect(result).toContain("persons=5");
    expect(result).toContain("teams=1");
  });

  // reset with no before and no after uses 0 for all counts
  test("reset with null before/after uses 0 for all counts", () => {
    const result = describe_changes({ action: "reset", entityType: "person" });
    expect(result).toContain("clearedData");
    expect(result).toContain("persons=0");
    expect(result).toContain("teams=0");
    expect(result).toContain("departments=0");
  });
});

describe("describeChanges — permission_denied action", () => {
  // permission_denied uses permissionKey from after
  test("permission_denied with permissionKey in after", () => {
    const result = describe_changes({
      action: "permission_denied",
      entityType: "person",
      after: JSON.stringify({ permissionKey: "person:delete" }),
    });
    expect(result).toContain("permissionDenied");
    expect(result).toContain("person:delete");
  });

  // permission_denied with no after falls back to unknown
  test("permission_denied with no after falls back to unknown", () => {
    const result = describe_changes({
      action: "permission_denied",
      entityType: "person",
      after: null,
    });
    expect(result).toContain("permissionDenied");
    expect(result).toContain("c:unknown");
  });
});

describe("describeChanges — rate_limited action", () => {
  // rate_limited uses rateLimitedAction from after
  test("rate_limited with rateLimitedAction in after", () => {
    const result = describe_changes({
      action: "rate_limited",
      entityType: "person",
      after: JSON.stringify({ rateLimitedAction: "createPerson" }),
    });
    expect(result).toContain("rateLimited");
    expect(result).toContain("createPerson");
  });

  // rate_limited with no after falls back to unknown
  test("rate_limited with no after falls back to unknown", () => {
    const result = describe_changes({
      action: "rate_limited",
      entityType: "person",
      after: null,
    });
    expect(result).toContain("rateLimited");
    expect(result).toContain("c:unknown");
  });
});

describe("describeChanges — unknown action", () => {
  // completely unknown action returns the dash
  test("unknown action returns tc('dash')", () => {
    const result = describe_changes({
      action: "totally_unknown",
      entityType: "person",
    });
    expect(result).toContain("c:dash");
  });
});

describe("describeChanges — null/undefined fallbacks (branch coverage)", () => {
  // create department with no name in after → unknown branch of (a?.name ?? unknown)
  test("create department with no name in after uses unknown", () => {
    const result = describe_changes({
      action: "create",
      entityType: "department",
      after: JSON.stringify({ description: "some dept" }), // no name field
    });
    expect(result).toContain("createdDepartment");
    expect(result).toContain("c:unknown");
  });

  // delete department with no name in before → unknown branch of (b?.name ?? unknown)
  test("delete department with no name in before uses unknown", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "department",
      before: JSON.stringify({ description: "old dept" }), // no name field
    });
    expect(result).toContain("deletedDepartment");
    expect(result).toContain("c:unknown");
  });

  // delete userPermission with empty before → key="" fallback of (b?.permissionKey ?? "")
  test("delete userPermission with no permissionKey uses empty string label", () => {
    const result = describe_changes({
      action: "delete",
      entityType: "userPermission",
      before: JSON.stringify({ targetEmail: "alice@example.com" }), // no permissionKey
    });
    expect(result).toContain("resetPermission");
  });

  // update person changedName: b.name is null → oldValue="" fallback (null ?? "" = "")
  test("update person changedName with null before.name uses empty string oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ name: null }),
      after: JSON.stringify({ name: "New Name" }),
    });
    expect(result).toContain("changedName");
    expect(result).toContain("oldValue=");
    expect(result).toContain("newValue=New Name");
  });

  // update person changedName: a.name is null (not undefined) → newValue="" fallback
  // (a?.name !== undefined is true when a.name=null; null !== "OldName" → enters changedName)
  test("update person changedName with null after.name uses empty string newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ name: "Old Name" }),
      after: JSON.stringify({ name: null }), // a.name = null, not undefined
    });
    expect(result).toContain("changedName");
    expect(result).toContain("oldValue=Old Name");
    expect(result).toContain("newValue=");
  });

  // update person changedPosition: b.position is null → oldValue="" fallback
  test("update person changedPosition with null before.position uses empty oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ position: null }),
      after: JSON.stringify({ position: "Developer" }),
    });
    expect(result).toContain("changedPosition");
  });

  // update person changedPosition: a.position is null → newValue="" fallback
  test("update person changedPosition with null after.position uses empty newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ position: "Old Role" }),
      after: JSON.stringify({ position: null }),
    });
    expect(result).toContain("changedPosition");
    expect(result).toContain("oldValue=Old Role");
  });

  // update person changedEmail: b.email is null → oldValue="" fallback
  test("update person changedEmail with null before.email uses empty oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ email: null }),
      after: JSON.stringify({ email: "new@test.com" }),
    });
    expect(result).toContain("changedEmail");
  });

  // update person changedEmail: a.email is null → newValue="" fallback
  test("update person changedEmail with null after.email uses empty newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: JSON.stringify({ email: "old@test.com" }),
      after: JSON.stringify({ email: null }),
    });
    expect(result).toContain("changedEmail");
    expect(result).toContain("oldValue=old@test.com");
  });

  // update team renamedTeam: b.teamName is null → oldValue="" fallback
  test("update team renamedTeam with null before.teamName uses empty oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ teamName: null }),
      after: JSON.stringify({ teamName: "New Team" }),
    });
    expect(result).toContain("renamedTeam");
  });

  // update team renamedTeam: a.teamName is null → newValue="" fallback
  test("update team renamedTeam with null after.teamName uses empty newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "team",
      before: JSON.stringify({ teamName: "Old Team" }),
      after: JSON.stringify({ teamName: null }),
    });
    expect(result).toContain("renamedTeam");
    expect(result).toContain("oldValue=Old Team");
  });

  // update department renamedDepartment: b.name is null → oldValue="" fallback
  test("update department renamedDepartment with null before.name uses empty oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({ name: null }),
      after: JSON.stringify({ name: "New Dept" }),
    });
    expect(result).toContain("renamedDepartment");
  });

  // update department renamedDepartment: a.name is null → newValue="" fallback
  test("update department renamedDepartment with null after.name uses empty newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "department",
      before: JSON.stringify({ name: "Old Dept" }),
      after: JSON.stringify({ name: null }),
    });
    expect(result).toContain("renamedDepartment");
    expect(result).toContain("oldValue=Old Dept");
  });

  // update user changedRole: b.role is null → oldValue="" fallback
  test("update user changedRole with null before.role uses empty oldValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "user",
      before: JSON.stringify({ role: null, targetEmail: "alice@example.com" }),
      after: JSON.stringify({ role: "administrator", targetEmail: "alice@example.com" }),
    });
    expect(result).toContain("changedRole");
  });

  // update user changedRole: a.role is null → newValue="" fallback
  test("update user changedRole with null after.role uses empty newValue", () => {
    const result = describe_changes({
      action: "update",
      entityType: "user",
      before: JSON.stringify({ role: "user", targetEmail: "alice@example.com" }),
      after: JSON.stringify({ role: null, targetEmail: "alice@example.com" }),
    });
    expect(result).toContain("changedRole");
    expect(result).toContain("oldValue=user");
  });

  // update userPermission with no permissionKey → "" fallback of (a?.permissionKey ?? "")
  test("update userPermission with no permissionKey uses empty string label", () => {
    const result = describe_changes({
      action: "update",
      entityType: "userPermission",
      before: JSON.stringify({ granted: false }),
      after: JSON.stringify({ granted: true, targetEmail: "alice@example.com" }), // no permissionKey
    });
    expect(result).toContain("grantedPermission");
  });

  // catch block: when tc("unknown") throws, falls into catch returning before ?? after ?? tc("dash")
  test("catch block returns tc(dash) when before and after are null", () => {
    // Make tc("unknown") throw to force the catch block to execute
    // but tc("dash") must work to test the catch return path
    let callCount = 0;
    const partiallyThrowingTc = (key: string) => {
      callCount++;
      if (key === "unknown") throw new Error("tc unknown crashed");
      return `c:${key}`;
    };
    const result = describeChanges({
      action: "create",
      entityType: "person",
      before: null,
      after: null,
      t,
      tc: partiallyThrowingTc,
      permissionLabels: {},
      userNames: {},
    });
    // In catch: before ?? after ?? tc("dash") = null ?? null ?? "c:dash" = "c:dash"
    expect(result).toBe("c:dash");
  });
});

describe("describeChanges — error handling", () => {
  // malformed JSON in before returns fallback (before ?? after ?? dash)
  test("malformed JSON in before returns before raw string", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: "not json",
      after: null,
    });
    // Should fall through to catch block and return before string
    expect(result).toBe("not json");
  });

  // malformed JSON in after with null before returns after string
  test("malformed JSON in after with null before returns after string", () => {
    const result = describe_changes({
      action: "update",
      entityType: "person",
      before: null,
      after: "bad json",
    });
    expect(result).toBe("bad json");
  });

  // both before and after null with invalid action returns tc('dash') in catch
  test("null before/after and crash scenario falls back to tc(dash)", () => {
    // Force a throw by making t throw — but we can't easily test this without
    // custom t function. Instead test the fallback path with a bad JSON + null after.
    const result = describeChanges({
      action: "update",
      entityType: "person",
      before: "bad json{{{",
      after: null,
      t,
      tc,
      permissionLabels,
      userNames,
    });
    expect(result).toBe("bad json{{{");
  });
});
