# Refactor Plan: Extract Domain Modules from serverActions + queries

Generated 2026-03-24. Read before touching any code.

---

## Current State

### serverActions — ALREADY SPLIT by Claude 3

`src/serverActions/` contains 10 domain files + 1 shared file:

| File            | Exported functions                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_shared.ts`    | `safe`, `validateUUID`, `ActionResult` (type)                                                                                                                                                                                           |
| `index.ts`      | Barrel re-export for all of the below                                                                                                                                                                                                   |
| `person.ts`     | `createPerson`, `removePerson`, `updatePersonName`, `updatePosition`, `updateEmail`, `addManager`                                                                                                                                       |
| `team.ts`       | `addMember`, `createTeam`, `updateTeamName`, `removeTeam`, `removeMember`                                                                                                                                                               |
| `department.ts` | `createDepartment`, `removeDepartment`, `updateDepartment`, `updateDepartmentHead`, `assignTeamToDepartment`, `removeTeamFromDepartment`                                                                                                |
| `admin.ts`      | `resetAll`, `seedMockData`, `initializePermissions`, `updateUserRole`, `updateUserPermission`, `kickOutUser`                                                                                                                            |
| `profile.ts`    | `updateProfileName`, `updateProfileImage`                                                                                                                                                                                               |
| `data.ts`       | `importPersonsCsv`, `exportPersonsCsv`, `exportTeamsCsv`, `exportDepartmentsCsv`, `exportAuditLogsCsv` + `ImportResult` (type)                                                                                                          |
| `leave.ts`      | `createLeaveType`, `updateLeaveType`, `deleteLeaveType`, `createLeaveRequest`, `reviewLeaveRequest`, `deleteLeaveRequest`, `allocateLeaveBalance`                                                                                       |
| `reviews.ts`    | `createReviewTemplate`, `deleteReviewTemplate`, `addReviewQuestion`, `removeReviewQuestion`, `createReviewCycle`, `deleteReviewCycle`, `openReviewCycle`, `closeReviewCycle`, `addReviewRequest`, `removeReviewRequest`, `submitReview` |
| `positions.ts`  | `createPositionEntry`, `deletePositionEntry`                                                                                                                                                                                            |

Existing barrel `src/serverActions/index.ts` → accessed via `@/serverActions` alias.
**No consumer imports need to change for actions** — the barrel handles it.

---

### queries.ts — MONOLITH (1,087 lines)

All reads live in `src/queries.ts`. Accessed via `@/queries` alias.
28 app pages + 3 components + 1 test file import from it.

| Domain                   | Functions                                                                                                                             | Lines (approx)    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **persons**              | `getPersons`, `getPagedPersons`                                                                                                       | 54–105            |
| **positions**            | `getPositions`                                                                                                                        | 64–73             |
| **teams**                | `getTeams`, `getPagedTeams`                                                                                                           | 107–204           |
| **departments**          | `getDepartments`, `getPagedDepartments`                                                                                               | 206–283           |
| **admin**                | `getUsers`, `getUserById`, `getAllPermissionKeys`                                                                                     | 285–328           |
| **audit**                | `getAuditLogs`, `getAuditLogUserEmails`                                                                                               | 330–531           |
| **profile**              | `getProfile`                                                                                                                          | 533–559           |
| **data**                 | `getDataExportCounts` + `DataExportCounts` interface                                                                                  | 561–581           |
| **reviews**              | `getReviewTemplates`, `getReviewTemplate`, `getReviewCycles`, `getReviewCycle`, `getMyReviewRequests`, `getReviewRequestWithTemplate` | 583–782           |
| **leave**                | `getLeaveTypes`, `getLeaveRequests`, `getLeaveBalances`                                                                               | 784–883           |
| **persons (extended)**   | `getEmployeeProfile`                                                                                                                  | 885–930           |
| **dashboard**            | `getOrgChartData`, `getDashboardMetrics`                                                                                              | 413–514, 932–1016 |
| **persons (impact)**     | `getPersonDeleteImpact`                                                                                                               | 1018–1055         |
| **teams (impact)**       | `getTeamDeleteImpact`                                                                                                                 | 1057–1073         |
| **departments (impact)** | `getDepartmentDeleteImpact`                                                                                                           | 1075–1087         |
| **re-exports**           | `PAGE_SIZE` (from `@/constants`)                                                                                                      | 52                |

---

## Shared Infrastructure

The following cross-cutting utilities are **already separate modules** — no changes needed:

| Module           | What it provides                                                              |
| ---------------- | ----------------------------------------------------------------------------- |
| `@/db`           | `prisma` client                                                               |
| `@/auth`         | `auth()` session                                                              |
| `@/permissions`  | `requirePermission`, `hasPermission`, `resolvePermissions`, `PERMISSION_KEYS` |
| `@/auditLog`     | `captureAuditContext`, `deferAudit`, `deferAuditLog`, `DeferredAuditEntry`    |
| `@/rateLimit`    | `rateLimit`, `rateLimitAuth`                                                  |
| `@/demoSession`  | `getDemoSessionId`                                                            |
| `@/actionErrors` | `ActionError`, `ErrorCode`                                                    |
| `@/mongoDb`      | `getAuditLogCollection`, `isMongoAvailable`                                   |

**One new lib file needed:**

```
src/lib/actionUtils.ts
```

Currently in `src/serverActions/_shared.ts`. Used by every action domain module.
Must move it here so `src/features/*/actions.ts` can import without cross-directory `../../..` paths.

Contents: `safe()`, `validateUUID()`, `ActionResult` type.

---

## Target Structure

```
src/
  lib/
    actionUtils.ts      # safe(), validateUUID(), ActionResult — moved from serverActions/_shared.ts

  features/
    persons/
      actions.ts        # createPerson, removePerson, updatePersonName, updatePosition, updateEmail, addManager
      queries.ts        # getPersons, getPagedPersons, getEmployeeProfile, getPersonDeleteImpact
    teams/
      actions.ts        # addMember, createTeam, updateTeamName, removeTeam, removeMember
      queries.ts        # getTeams, getPagedTeams, getTeamDeleteImpact
    departments/
      actions.ts        # createDepartment, removeDepartment, updateDepartment, updateDepartmentHead, assignTeamToDepartment, removeTeamFromDepartment
      queries.ts        # getDepartments, getPagedDepartments, getDepartmentDeleteImpact
    reviews/
      actions.ts        # createReviewTemplate, deleteReviewTemplate, addReviewQuestion, removeReviewQuestion, createReviewCycle, deleteReviewCycle, openReviewCycle, closeReviewCycle, addReviewRequest, removeReviewRequest, submitReview
      queries.ts        # getReviewTemplates, getReviewTemplate, getReviewCycles, getReviewCycle, getMyReviewRequests, getReviewRequestWithTemplate
    leave/
      actions.ts        # createLeaveType, updateLeaveType, deleteLeaveType, createLeaveRequest, reviewLeaveRequest, deleteLeaveRequest, allocateLeaveBalance
      queries.ts        # getLeaveTypes, getLeaveRequests, getLeaveBalances
    positions/
      actions.ts        # createPositionEntry, deletePositionEntry
      queries.ts        # getPositions
    admin/
      actions.ts        # resetAll, seedMockData, initializePermissions, updateUserRole, updateUserPermission, kickOutUser
      queries.ts        # getUsers, getUserById, getAllPermissionKeys, getDataExportCounts + DataExportCounts type
    profile/
      actions.ts        # updateProfileName, updateProfileImage
      queries.ts        # getProfile
    data/
      actions.ts        # importPersonsCsv, exportPersonsCsv, exportTeamsCsv, exportDepartmentsCsv, exportAuditLogsCsv + ImportResult type
    audit/
      queries.ts        # getAuditLogs, getAuditLogUserEmails
    dashboard/
      queries.ts        # getDashboardMetrics, getOrgChartData

  # Backwards-compat barrels (keep forever until all imports updated)
  serverActions/
    index.ts            # re-exports from src/features/*/actions.ts
    _shared.ts          # re-exports from src/lib/actionUtils.ts (or keep in place)
  queries.ts            # re-exports from src/features/*/queries.ts, re-exports PAGE_SIZE
```

---

## What Does NOT Change

- All `@/serverActions` imports in 65+ consumer files — barrel handles it
- All `@/queries` imports in 28 app pages + 3 components + tests — barrel handles it
- Function names, signatures, logic — zero changes
- Test files — zero changes required (mocks point to `@/serverActions` / `@/queries`)
- Database schema, Prisma, auth, permissions — zero changes

---

## Migration Order (smallest → largest)

| Step | Domain                          | Actions | Queries | Complexity   |
| ---- | ------------------------------- | ------- | ------- | ------------ |
| 0    | Create `src/lib/actionUtils.ts` | —       | —       | Trivial      |
| 1    | **positions**                   | 2       | 1       | 🟢           |
| 2    | **profile**                     | 2       | 1       | 🟢           |
| 3    | **data**                        | 5       | 0       | 🟢           |
| 4    | **audit**                       | 0       | 2       | 🟢           |
| 5    | **dashboard**                   | 0       | 2       | 🟡 (raw SQL) |
| 6    | **persons**                     | 6       | 4       | 🟡           |
| 7    | **teams**                       | 5       | 3       | 🟡           |
| 8    | **departments**                 | 6       | 3       | 🟡           |
| 9    | **leave**                       | 7       | 3       | 🟡           |
| 10   | **admin**                       | 6       | 4       | 🟡           |
| 11   | **reviews**                     | 11      | 6       | 🔴 (largest) |

Each step:

1. Create `src/features/<domain>/actions.ts` (copy from `src/serverActions/<domain>.ts`, update `_shared` import to `@/lib/actionUtils`)
2. Create `src/features/<domain>/queries.ts` (extract from `src/queries.ts`)
3. Update `src/serverActions/index.ts` barrel to re-export from new location
4. Update `src/queries.ts` barrel to re-export from new location
5. Delete `src/serverActions/<domain>.ts`
6. Remove extracted functions from `src/queries.ts`
7. `npm run build` — must be green
8. `npm run test:all` — 1636 tests must pass
9. Commit: `refactor(modularity): extract <domain> domain to src/features/<domain>/`

---

## Risk Assessment

**Low risk overall** because:

- All consumer imports go through barrel files — no grep-and-replace needed
- Logic is copied verbatim — no functional changes
- Each step is independently verifiable with build + tests
- Rollback = revert the commit for that domain

**One gotcha to watch:**

- `src/serverActions/_shared.ts` is imported as `"./_shared"` (relative) by all action modules.
  After moving to `src/features/*/actions.ts`, the import becomes `"@/lib/actionUtils"`.
  This is the only import path that changes inside the moved files.

**Another gotcha:**

- `src/queries.ts` re-exports `PAGE_SIZE` from `@/constants`. The barrel must keep this re-export.
- `src/queries.ts` exports the `DataExportCounts` interface. The barrel must keep this export too
  (it's imported by `src/tests/DataImportExport.test.tsx` and likely others).

---

## Verification Checklist (after all steps)

- [ ] `npm run build` passes
- [ ] `npm run test:all` — 1636 tests, 0 failures
- [ ] `npm run lint` — 0 errors
- [ ] `grep -r "from.*serverActions/person" src/` — only `src/features/persons/` and `src/serverActions/index.ts`
- [ ] `grep -r "from.*serverActions/_shared" src/` — only `src/lib/actionUtils.ts` or gone
- [ ] No functions left directly in `src/queries.ts` — only re-exports
- [ ] No functions left directly in `src/serverActions/index.ts` — only re-exports
