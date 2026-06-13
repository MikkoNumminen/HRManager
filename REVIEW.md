# HRManager — Code Review Report

> **⚠️ Historical — 2026-03-25.** Predates the feature-module refactor: the monolithic
> `serverActions.ts` / `queries.ts` described here were since split into `src/features/*`.
> Kept for history; do **not** act on its findings against the current codebase.
> Current architecture: [`AGENTS.md`](AGENTS.md), [`docs/architecture.md`](docs/architecture.md).

**Date:** 2026-03-25
**Reviewer:** Claude Sonnet (automated multi-layer review)
**Scope:** Full codebase — UI layer, business logic layer, configuration & types layer
**Method:** 3 parallel subagents reviewing 307 source files across all layers

> **⚠️ Note (2026-03-26):** File paths in this report reference the **pre-modularization** flat structure (e.g. `src/components/X`, `src/serverActions.ts`, `src/queries.ts`). After the modularization on 2026-03-26, these files now live in `src/features/*/` modules. See `CLAUDE.md` Architecture rules for the current structure.

---

## Table of Contents

1. [DRY Violations](#1-dry-violations)
2. [Readability & Clarity](#2-readability--clarity)
3. [Structure & Modularity](#3-structure--modularity)
4. [Error Handling](#4-error-handling)
5. [Type Safety](#5-type-safety)
6. [Naming & Consistency](#6-naming--consistency)
7. [Security](#7-security)
8. [Configuration & Schema](#8-configuration--schema)
9. [Performance](#9-performance)
10. [Accessibility](#10-accessibility)
11. [Summary](#11-summary)

---

## 1. DRY Violations

---

### DRY-01 — Six Near-Identical Table Components

- **Files**: `src/components/PersonsTable.tsx`, `src/components/EditablePersonsTable.tsx`, `src/components/TeamsTable.tsx`, `src/components/EditableTeamsTable.tsx`, `src/components/DepartmentsTable.tsx`, `src/components/EditableDepartmentsTable.tsx`
- **Severity**: 🔴 critical
- **Issue**: All six components share ~90% identical structure: desktop/mobile responsive layout, empty-state handling, table header mapping, mobile card rendering, row hover interactions, and initials generation. Changes to table logic must be replicated six times.
- **Fix**: Extract a generic `DataTable<T>` component:

```tsx
// src/components/DataTable.tsx
interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage: string;
  getRowKey: (item: T) => string;
  getInitials?: (item: T) => string;
  minimal?: boolean;
  onRowClick?: (id: string) => void;
  renderMobileCard?: (item: T) => React.ReactNode;
}

export default function DataTable<T>({ data, columns, emptyMessage, ... }: DataTableProps<T>) {
  // single generic implementation
}
```

---

### DRY-02 — `useActionState` Boilerplate Repeated 31 Times

- **Files**: All form components in `src/components/` — `AddPeople.tsx`, `AddDepartment.tsx`, `AddTeam.tsx`, `RemovePerson.tsx`, `RemoveDepartment.tsx`, `RemoveTeam.tsx`, and ~25 more
- **Severity**: 🔴 critical
- **Issue**: Every single form component repeats this identical structure:

```tsx
const [state, formAction, isPending] = useActionState(
  async (_prev: FormState, formData: FormData): Promise<FormState> => {
    onOptimisticAdd?.(...);
    const result = await serverAction(formData);
    if (result?.error) return { error: result.error, success: false };
    showSnackbar(t("successMessage"));
    return { error: null, success: true };
  },
  { error: null, success: false },
);
```

- **Fix**: A `FormWrapper` higher-order component or a `useFormAction` hook:

```tsx
// src/hooks/useFormAction.ts
export function useFormAction<T>(
  action: (data: FormData) => Promise<ActionResult<T>>,
  options: { successMessage: string; onSuccess?: (data: T) => void },
) {
  const { showSnackbar } = useSnackbar();
  return useActionState(
    async (_prev, formData) => {
      const result = await action(formData);
      if (result?.error) return { error: result.error };
      options.onSuccess?.(result.data);
      showSnackbar(options.successMessage);
      return { error: null };
    },
    { error: null },
  );
}
```

---

### DRY-03 — Permission + RateLimit Boilerplate in 24+ Action Files

- **Files**: Every file in `src/features/*/actions.ts` and `src/serverActions/`
- **Severity**: 🟡 important
- **Issue**: Every action function starts with the same three lines:

```typescript
const t = await getTranslations("errors");
await requirePermission("some:permission");
await rateLimit("some-action");
```

This appears in every single action — `createPerson`, `removePerson`, `updatePersonName`, `createTeam`, `removeTeam`, `createDepartment`, `requestLeaveTime`, `approveLeaveRequest`, `createReviewTemplate`, etc.

- **Fix**: A typed action guard wrapper:

```typescript
// src/lib/actionGuard.ts
export function guardedAction<TArgs extends unknown[], TReturn>(
  permission: PermissionKey,
  rateLimitAction: string,
  fn: (...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs): Promise<ActionResult<TReturn>> => {
    return safe(async () => {
      await requirePermission(permission);
      await rateLimit(rateLimitAction);
      return fn(...args);
    });
  };
}
```

---

### DRY-04 — Audit Entry Construction Duplicated 50+ Times

- **Files**: All action files across all features
- **Severity**: 🟡 important
- **Issue**: The audit capture + defer pattern is copy-pasted into every transaction block. Additionally, `captureAuditContext()` is called inside the transaction, blocking it unnecessarily.

```typescript
// Current (repeated ~50 times):
await prisma.$transaction(async (tx) => {
  const ctx = await captureAuditContext(); // ← should be outside transaction
  const auditEntries: DeferredAuditEntry[] = [];
  // ... mutations ...
  auditEntries.push({ ...ctx, action, entityType, entityId, before, after });
});
deferAudit(auditEntries);
```

- **Fix**: Extract a `withAuditedTransaction` helper:

```typescript
// src/lib/auditedTransaction.ts
export async function withAuditedTransaction<T>(
  fn: (
    tx: PrismaClient,
    audit: (entry: Omit<DeferredAuditEntry, keyof AuditContext>) => void,
  ) => Promise<T>,
): Promise<T> {
  const ctx = await captureAuditContext(); // outside transaction
  const entries: DeferredAuditEntry[] = [];
  const result = await prisma.$transaction((tx) => fn(tx, (e) => entries.push({ ...ctx, ...e })));
  deferAudit(entries);
  return result;
}
```

---

### DRY-05 — Initials Generation Repeated 6+ Times

- **Files**: `src/components/PersonsTable.tsx`, `src/components/TeamsTable.tsx`, `src/components/DepartmentsTable.tsx`, `src/components/TopBar.tsx`, and 2+ more
- **Severity**: 🟡 important
- **Issue**: This snippet is copy-pasted at least 6 times across components with no null safety:

```tsx
const initials = name
  .split(" ")
  .map((n) => n[0])
  .join("")
  .toUpperCase()
  .slice(0, 2);
```

If `name` is an empty string or whitespace, this produces silent empty output. `n[0]` can be `undefined` on empty words.

- **Fix**:

```typescript
// src/utils/initials.ts
export function getInitials(name: string | null | undefined, maxLength = 2): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .filter(Boolean)
    .slice(0, maxLength)
    .join("");
}
```

---

### DRY-06 — Dialog Paper Styles Repeated in 4+ Components

- **Files**: `src/components/ConfirmDialog.tsx`, `src/components/CsvImportDialog.tsx`, `src/components/TwoFactorSetup.tsx`, `src/components/LeaveManager.tsx`
- **Severity**: 🟢 suggestion
- **Issue**: Identical dialog paper style object defined inline in each:

```tsx
slotProps={{
  paper: {
    sx: {
      backgroundColor: colors.slate700,
      border: `1px solid ${colors.slate300}`,
      borderRadius: "8px",
    },
  },
}}
```

- **Fix**: Add to `src/muiStyles.ts`:

```typescript
export const dialogPaperSx = {
  backgroundColor: colors.slate700,
  border: `1px solid ${colors.slate300}`,
  borderRadius: "8px",
} as const;
```

---

### DRY-07 — Keyboard `Enter`/`Space` Handler Repeated in 3 Editable Tables

- **Files**: `src/components/EditablePersonsTable.tsx:76-87`, `src/components/EditableTeamsTable.tsx:76-87`, `src/components/EditableDepartmentsTable.tsx:76-87`
- **Severity**: 🟢 suggestion
- **Issue**: Identical inline onKeyDown handlers.
- **Fix**:

```typescript
// src/utils/keyboardHandlers.ts
export const onActivateKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handler();
  }
};
```

---

### DRY-08 — Person Selection Grid Layout Repeated in 4 Components

- **Files**: `src/components/UpdateManager.tsx:57-74`, `src/components/UpdateDepartmentHead.tsx:57-74`, `src/components/AddPeopleToTeam.tsx`, `src/components/RemoveMemberFromTeam.tsx`
- **Severity**: 🟢 suggestion
- **Issue**: Same grid styles copy-pasted in all four.
- **Fix**: Add `personSelectGridSx` to `src/muiStyles.ts`.

---

## 2. Readability & Clarity

---

### READ-01 — `TopBar.tsx` is 754 Lines — Too Complex to Reason About

- **File**: `src/components/TopBar.tsx` (754 lines)
- **Severity**: 🔴 critical
- **Issue**: The component has at least 9 distinct responsibilities: app bar layout, user auth state, desktop menu, mobile drawer, data seed dialog, data reset dialog, tutorial state, permission checking, back-button navigation. Understanding any one part requires scrolling through hundreds of unrelated lines.
- **Fix**: Split into focused sub-components:

```
src/components/TopBar/
├── TopBar.tsx          (~150 lines — orchestrator only)
├── UserMenu.tsx        (~150 lines — avatar, logout, profile link)
├── NavMenu.tsx         (~150 lines — navigation items list)
├── MobileDrawer.tsx    (~120 lines — mobile nav drawer)
├── AdminTools.tsx      (~120 lines — seed/reset dialogs)
└── HeaderTitle.tsx     (~40 lines  — title + back button)
```

---

### READ-02 — `LeaveManager.tsx` is 879 Lines with 3 Embedded Components

- **File**: `src/components/LeaveManager.tsx` (879 lines)
- **Severity**: 🔴 critical
- **Issue**: Three large sub-functions (`RequestsTab` ~254 lines, `LeaveTypesTab` ~197 lines, `BalancesTab` ~247 lines) are defined inside the file as local functions, making the file impossible to test or navigate independently.
- **Fix**:

```
src/components/LeaveManager/
├── LeaveManager.tsx        (~100 lines — tab switcher only)
├── LeaveRequestsTab.tsx    (~270 lines)
├── LeaveTypesTab.tsx       (~200 lines)
├── LeaveBalancesTab.tsx    (~250 lines)
└── hooks/useLeaveForm.ts   (shared state logic)
```

---

### READ-03 — `AuditLogViewer.tsx` — 590 Lines with 80-Branch Callback

- **File**: `src/components/AuditLogViewer.tsx` (590 lines)
- **Severity**: 🟡 important
- **Issue**: The `describeChanges` callback (lines 143–250) has 80+ conditional branches and is defined inline. It acts as a business logic formatter, not a UI concern, and belongs in a utility file.
- **Fix**: Extract to `src/utils/auditLogDescriber.ts`.

---

### READ-04 — Large Action Files Mix Many Concerns

- **Files**: `src/features/reviews/actions.ts` (599 lines), `src/features/admin/actions.ts` (508 lines), `src/features/leave/actions.ts` (456 lines)
- **Severity**: 🟡 important
- **Issue**: Each file defines 8–12 unrelated action functions. The `seedMockData` function alone in `admin/actions.ts` is 140 lines doing 6 different things (persons, teams, memberships, departments, leave types, balances).
- **Fix**: Split by domain sub-concern, e.g. `reviews/templateActions.ts`, `reviews/cycleActions.ts`, `reviews/submissionActions.ts`.

---

### READ-05 — Date Formatting Without Locale or Error Guard (20+ Locations)

- **Files**: `src/components/PersonsTable.tsx:152`, `src/components/TeamsTable.tsx:111`, `src/components/DepartmentsTable.tsx:128`, and 17+ more
- **Severity**: 🟡 important
- **Issue**: Raw `new Date(x).toLocaleString()` is called without locale context and without guarding against invalid date values. Uses browser locale instead of the app's active locale.
- **Fix**:

```typescript
// src/utils/formatDate.ts
export function formatDate(
  value: Date | string | number | null | undefined,
  locale = "en",
): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale);
  } catch {
    return "—";
  }
}
```

---

## 3. Structure & Modularity

---

### STRUCT-01 — Employee Portal Pages Outside `[locale]` Routing

- **File**: `src/app/employee/` (entire directory)
- **Severity**: 🔴 critical (already tracked in TODO as locale routing fix)
- **Issue**: Employee portal pages landed at `src/app/employee/` instead of `src/app/[locale]/employee/`. next-intl's `useTranslations` will fail to pick up locale context from the URL. All other admin pages are similarly at root without locale segments, which means the entire routing strategy is using a non-locale-prefixed setup — this must be intentional or needs documentation.

---

### STRUCT-02 — `src/queries.ts` is a God File at Root Level

- **File**: `src/queries.ts`
- **Severity**: 🟡 important
- **Issue**: Root-level `queries.ts` coexists with `src/features/*/queries.ts`. This creates ambiguity about where queries live. New developers won't know whether to put a query in the root file or a feature file.
- **Fix**: Migrate all queries from `src/queries.ts` into the relevant feature folder, then delete the root file.

---

### STRUCT-03 — `src/serverActions/` Directory Alongside `src/features/*/actions.ts`

- **File**: `src/serverActions/`
- **Severity**: 🟡 important
- **Issue**: Two parallel patterns for server actions: some live in `src/serverActions/`, others in `src/features/*/actions.ts`. New developers must check both locations.
- **Fix**: Consolidate everything into the feature-folder pattern. Move or redirect contents of `src/serverActions/` into appropriate `src/features/*/` directories.

---

### STRUCT-04 — No Barrel Exports — Deep Import Paths Everywhere

- **Files**: All consumer files
- **Severity**: 🟢 suggestion
- **Issue**: Components are imported with full paths like `import { AddPersonForm } from "@/components/AddPeople"`. Adding a barrel `src/components/index.ts` would allow `import { AddPersonForm } from "@/components"` and make refactors easier.

---

## 4. Error Handling

---

### ERR-01 — All Query Permission Checks Throw Untyped `Error()` Not `ActionError`

- **Files**: `src/features/persons/queries.ts:8-9`, `src/features/teams/queries.ts:8-9`, `src/features/departments/queries.ts:8-9`, and 7+ more
- **Severity**: 🔴 critical
- **Issue**: Every query function throws a generic `Error("Permission denied")`. These are untranslated, have no error code, and are not caught by the `safe()` wrapper in action files. A permission denial in a query will crash the page with an unhandled error instead of displaying a user-friendly message.

```typescript
// Current — all 10+ query files:
if (!allowed) throw new Error("Permission denied"); // ← plain, untyped, uncaught
```

- **Fix**:

```typescript
import { ActionError } from "@/actionErrors";

if (!allowed) throw new ActionError("permissionDenied", t("permissionDenied"));
```

---

### ERR-02 — `importPersonsCsv` Breaks the `ActionResult` Contract

- **File**: `src/features/data/actions.ts:19-94`
- **Severity**: 🔴 critical
- **Issue**: This action returns a plain `{ error?, code?, result? }` object instead of using the `safe()` wrapper. If an unhandled exception occurs mid-import, it will propagate as an unhandled promise rejection instead of returning `{ error: "...", success: false }`.
- **Fix**: Wrap the function body in `safe()`.

---

### ERR-03 — Missing `deletedAt: null` Guard in Person Lookups

- **File**: `src/features/persons/actions.ts:320-328`, and similar patterns across `leave/actions.ts`, `reviews/actions.ts`
- **Severity**: 🟡 important
- **Issue**: Several `tx.person.findFirst({ where: { id, sessionId } })` calls don't include `deletedAt: null`. A soft-deleted person could be found and mutated.

```typescript
// Current:
const person = await tx.person.findFirst({ where: { id: personID, sessionId } });

// Fix:
const person = await tx.person.findFirst({ where: { id: personID, sessionId, deletedAt: null } });
```

---

### ERR-04 — Silent `lastActiveAt` Failure in Auth JWT Callback

- **File**: `src/auth.ts:188-189`
- **Severity**: 🟡 important
- **Issue**: The `lastActiveAt` DB update is silently swallowed with `.catch(() => {})`. If the DB is down, stale session tokens continue to pass the validity check at line 174, allowing sessions that should be expired to remain active.
- **Fix**: At minimum, log the error. Consider flagging the session as unverifiable.

---

### ERR-05 — Inconsistent Permission Checking Pattern in API Routes

- **File**: `src/app/api/audit/verify/route.ts:11`
- **Severity**: 🟡 important
- **Issue**: This API route checks permissions by accessing `session?.user?.permissions?.["admin:view_audit_log"]` directly, bypassing the `hasPermission()` utility. If the permission system changes, this breaks silently.
- **Fix**: Use `hasPermission("admin:view_audit_log")` consistently everywhere.

---

### ERR-06 — Demo Session Ownership Not Validated in Destructive Operations

- **Files**: `src/features/data/actions.ts`, `src/features/admin/actions.ts`
- **Severity**: 🟢 suggestion
- **Issue**: Data reset/seed operations check `requirePermission()` but don't validate `demoSessionId` ownership. A demo user with the right permissions could theoretically reset another demo session's data if they obtained the session ID.
- **Fix**: Add `sessionId` cross-check in destructive operations.

---

## 5. Type Safety

---

### TYPE-01 — Permissions Typed as `Record<string, boolean>` — Too Loose

- **File**: `src/types/next-auth.d.ts:15,27`
- **Severity**: 🟡 important
- **Issue**: `permissions?: Record<string, boolean>` accepts any string as a permission key. A typo like `"leave:approvee"` will not be caught at compile time.
- **Fix**: Define a `PermissionKey` union type and use it:

```typescript
// src/types/permissions.ts
export type PermissionKey =
  | "person:read"
  | "person:create"
  | "person:update"
  | "person:delete"
  | "team:read"
  | "team:create"
  | "team:update"
  | "team:delete"
  | "leave:view"
  | "leave:request"
  | "leave:approve"
  | "department:read"
  | "department:create"
  | "department:update"
  | "department:delete"
  | "admin:all"
  | "admin:view_audit_log";
// ... etc

// src/types/next-auth.d.ts
import { PermissionKey } from "./permissions";
interface Session {
  user: {
    permissions?: Partial<Record<PermissionKey, boolean>>;
  };
}
```

---

### TYPE-02 — Audit Log Labels Typed as `Record<string, string>` Instead of Keyed Unions

- **File**: `src/components/AuditLogViewer.tsx:81-109`
- **Severity**: 🟡 important
- **Issue**: `entityTypeLabels` and `actionLabels` are `Record<string, string>`. A missing key returns `undefined` silently at runtime.
- **Fix**: Use exhaustive union types so TypeScript catches missing entries.

---

### TYPE-03 — Raw SQL Results Cast Without Validation

- **File**: `src/features/dashboard/queries.ts:29-49`
- **Severity**: 🟡 important
- **Issue**: `prisma.$queryRaw` results are cast directly to typed arrays with no runtime validation. If a SQL column is renamed or returns `null`, the cast will silently produce wrong data.
- **Fix**: Validate with Zod after the raw query:

```typescript
const DashboardRowSchema = z.object({ count: z.number() });
const raw = await prisma.$queryRaw`SELECT COUNT(*) AS count FROM ...`;
const rows = z.array(DashboardRowSchema).parse(raw);
```

---

### TYPE-04 — `any` Type in Cache Wrapper

- **File**: `src/features/dashboard/queries.ts:18`
- **Severity**: 🟢 suggestion
- **Issue**: `function cache<T extends (...args: any[]) => Promise<any>>` uses `any` as a convenience. Acceptable workaround for Next.js `unstable_cache` limitations, but should have a comment explaining why.
- **Fix**: Add a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with explanatory comment.

---

### TYPE-05 — Missing Explicit Return Types on Several Components

- **File**: `src/components/LeaveManager.tsx` (inline `TabPanel` function) and several others
- **Severity**: 🟢 suggestion
- **Issue**: Local component functions inside files omit `: React.ReactNode` return type. TypeScript infers it, but explicit types improve readability and catch accidental `undefined` returns.

---

## 6. Naming & Consistency

---

### NAME-01 — `AddPeople.tsx` Exports `AddPersonForm` — File and Export Don't Match

- **Files**: `src/components/AddPeople.tsx`, `src/components/RemovePerson.tsx`, `src/components/UpdatePosition.tsx` and others
- **Severity**: 🟡 important
- **Issue**: File is named `AddPeople.tsx` (plural) but exports `AddPersonForm` (singular). The convention is inconsistent across the component directory.
- **Fix**: Standardize to `<Action><Entity>Form` for exports and `<ActionEntity>Form.tsx` for file names. Rename:
  - `AddPeople.tsx` → `AddPersonForm.tsx`
  - etc.

---

### NAME-02 — `PersonsTable` vs `EditablePersonsTable` — "Editable" Doesn't Mean What It Implies

- **Files**: All `Editable*Table` components
- **Severity**: 🟢 suggestion
- **Issue**: `EditablePersonsTable` is not actually editable inline — it's clickable rows that navigate to a management page. The name implies in-place editing.
- **Fix**: Rename to `PersonsTableNav.tsx` / `PersonsTableClickable.tsx` or add a JSDoc comment clarifying the behavior.

---

### NAME-03 — `src/queries.ts` Root File vs `src/features/*/queries.ts` Pattern

- **File**: `src/queries.ts`
- **Severity**: 🟡 important (see also STRUCT-02)
- **Issue**: The root `queries.ts` is named identically to feature-level query files but lives outside the feature folders. Confusing naming pattern.

---

### NAME-04 — Inconsistent Session ID Variable Names

- **Files**: Various — `demoSessionId`, `sessionId`, `session_id` appear across files
- **Severity**: 🟢 suggestion
- **Issue**: Minor casing inconsistency across feature files in how the demo session ID is referenced.

---

## 7. Security

---

### SEC-01 — Secrets Committed to `.env` File

- **File**: `.env`
- **Severity**: 🔴 critical
- **Issue**: Real credentials are present in the `.env` file which appears to be tracked by git:
  - `AUTH_SECRET` with a real signing key
  - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` with real OAuth credentials
  - Database password
- **Fix**:
  1. Rotate Google OAuth credentials in Google Cloud Console immediately
  2. Generate a new `AUTH_SECRET`
  3. Run `git rm --cached .env` and commit to stop tracking
  4. Verify `.gitignore` includes `.env` (without `.env.example`)
  5. Audit git history for any other secret leaks (`git log --all -p -- .env`)

---

### SEC-02 — `next-auth` Beta in Production

- **File**: `package.json` — `"next-auth": "5.0.0-beta.30"`
- **Severity**: 🟡 important
- **Issue**: Auth library is on a beta version. Beta releases may contain unpatched security vulnerabilities or breaking API changes without semver guarantees.
- **Fix**: Pin to a stable release or document a tracked issue for upgrading once v5 stabilizes.

---

## 8. Configuration & Schema

---

### CFG-01 — `LeaveRequest.status` is a String, Not an Enum

- **File**: `prisma/schema.prisma:297`
- **Severity**: 🟡 important
- **Issue**: `status String @default("pending") // pending, approved, rejected` is a plain string while `ReviewType`, `CycleStatus`, and `QuestionType` are proper Prisma enums. Inconsistency — typos like `"Approved"` will not be caught at the DB layer.
- **Fix**:

```prisma
enum LeaveRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

model LeaveRequest {
  status  LeaveRequestStatus @default(PENDING)
}
```

---

### CFG-02 — `setLocale()` Validates Locale Without Zod Exhaustiveness Check

- **File**: `src/i18n/actions.ts:6-14`
- **Severity**: 🟢 suggestion
- **Issue**: Locale validation uses `locales.includes()` which is a runtime array check. If the `locales` array changes, there's no compile-time enforcement.
- **Fix**: Use Zod enum derived from the const array:

```typescript
const localeEnum = z.enum(locales as [string, ...string[]]);
export async function setLocale(locale: string) {
  const parsed = localeEnum.safeParse(locale);
  if (!parsed.success) return;
  // ...
}
```

---

### CFG-03 — Chromatic CI Uses `--legacy-peer-deps`

- **File**: `.github/workflows/chromatic.yml:30`
- **Severity**: 🟢 suggestion
- **Issue**: `npm ci --legacy-peer-deps` suppresses peer dependency conflict errors. This masks a real dependency conflict that should be resolved.
- **Fix**: Identify the conflicting package, add a `resolutions` field, or upgrade to eliminate the conflict.

---

### CFG-04 — `.env.test` Credentials in Version Control

- **File**: `.env.test`
- **Severity**: 🟢 suggestion
- **Issue**: Test database credentials are committed. While less severe than production secrets, it's the same bad pattern.
- **Fix**: Use environment variable injection in CI, move to `.env.test.local` pattern.

---

## 9. Performance

---

### PERF-01 — No `React.memo` on Heavy Components

- **Files**: `src/components/AuditLogViewer.tsx` (590 lines), `src/components/TopBar.tsx` (754 lines), `src/components/LeaveManager.tsx` (879 lines)
- **Severity**: 🟡 important
- **Issue**: These three large components re-render on every parent re-render. Given their complexity, each render is expensive.
- **Fix**: Wrap with `React.memo` and extract stable callback references with `useCallback`.

---

### PERF-02 — `initials` Recomputed on Every Render in `TopBar`

- **File**: `src/components/TopBar.tsx:62`
- **Severity**: 🟢 suggestion
- **Issue**: User initials string is recomputed on every render but `user.name` rarely changes.
- **Fix**: `const initials = useMemo(() => getInitials(user?.name), [user?.name]);`

---

## 10. Accessibility

---

### A11Y-01 — Inconsistent `aria-label` on Interactive Table Rows

- **Files**: `src/components/EditablePersonsTable.tsx` (has `aria-label`), `src/components/PersonsTable.tsx` (no `aria-label`), `src/components/TeamsTable.tsx` (no `role="button"` on mobile cards)
- **Severity**: 🟡 important
- **Issue**: Only editable tables have accessibility attributes on interactive elements. Non-editable tables used as read-only displays still have clickable elements without labels in some cases.
- **Fix**: Apply consistent `role`, `tabIndex`, and `aria-label` to every interactive row/card pattern.

---

## 11. Summary

### Findings by Category

| Category               | 🔴 Critical | 🟡 Important | 🟢 Suggestion | Total  |
| ---------------------- | ----------- | ------------ | ------------- | ------ |
| DRY Violations         | 2           | 3            | 3             | **8**  |
| Readability & Clarity  | 2           | 3            | 0             | **5**  |
| Structure & Modularity | 1           | 2            | 1             | **4**  |
| Error Handling         | 2           | 3            | 1             | **6**  |
| Type Safety            | 0           | 3            | 2             | **5**  |
| Naming & Consistency   | 0           | 2            | 2             | **4**  |
| Security               | 1           | 1            | 0             | **2**  |
| Configuration & Schema | 0           | 1            | 3             | **4**  |
| Performance            | 0           | 1            | 1             | **2**  |
| Accessibility          | 0           | 1            | 0             | **1**  |
| **TOTAL**              | **8**       | **20**       | **13**        | **41** |

### Findings by Severity

| Severity      | Count |
| ------------- | ----- |
| 🔴 Critical   | 8     |
| 🟡 Important  | 20    |
| 🟢 Suggestion | 13    |

### Overall Code Quality Grade: **B+**

The codebase has solid architecture — proper Server Component / Client Component split, `$transaction` discipline, audit logging, multi-locale support, and a clear feature-folder structure. The main weaknesses are accumulated DRY debt across 24+ action files and 6+ table components, two oversized god components (`TopBar`, `LeaveManager`), and one critical security issue (committed secrets). The business logic is sound; the problems are primarily structural and maintainability-related.

### Top 5 Most Impactful Fixes

| Priority | Finding                                                                            | Effort | Impact             |
| -------- | ---------------------------------------------------------------------------------- | ------ | ------------------ |
| 1        | **SEC-01** — Rotate and remove committed secrets from `.env`                       | 30 min | 🔴 Security        |
| 2        | **ERR-01** — Convert all query `Error("Permission denied")` to `ActionError`       | 2h     | 🔴 Correctness     |
| 3        | **DRY-01** — Generic `DataTable<T>` to replace 6 duplicate table components        | 1 day  | 🔴 Maintainability |
| 4        | **DRY-02** — `useFormAction` hook to replace 31-file `useActionState` boilerplate  | 4h     | 🟡 Maintainability |
| 5        | **READ-01/02** — Split `TopBar.tsx` (754 lines) and `LeaveManager.tsx` (879 lines) | 1 day  | 🟡 Readability     |
