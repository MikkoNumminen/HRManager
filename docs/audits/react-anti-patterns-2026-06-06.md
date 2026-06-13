# React anti-patterns audit — 2026-06-06

> **⚠️ Historical snapshot — 2026-06-06.** This report records the repo's state on its run date.
> The confirmed **critical/high** findings were remediated in PRs #14–#23; medium/low items were
> triaged and either fixed or parked. Do **not** treat findings here as open work without
> re-confirming against current `main`. Living status: [`SECURITY.md`](../../SECURITY.md),
> [`docs/audits/README.md`](README.md), and the AI-first rating doc.

**Scope:** project root (`/Users/mikko/koodailua/publicHRM/HRManager`)
**Pre-flight:** React codebase confirmed — `react ^19.2.4` in package.json, 251 .tsx files, Next.js 16 App Router. Proceeding with the full audit.

## Summary

| Check                             |                              Findings |
| --------------------------------- | ------------------------------------: |
| key-as-index-in-lists             |                                     5 |
| useEffect-for-derived-state       |                                     0 |
| dep-array-lies                    |                                     0 |
| state-mutation-instead-of-replace |                                     0 |
| effect-cleanup-missing            |                                     1 |
| multiple-sources-of-truth         | 11 (3 high-confidence + 8 borderline) |
| **Total**                         |                                **17** |

**Codebase shape note:** the app is heavily Server Component-based — only 14 `useEffect` calls and 54 `useState` calls across 255 .tsx files. Most pages are async RSCs passing data to thin Client Components, so the audit's surface area is small relative to file count. The findings are concentrated in shared providers, optimistic-update wrappers, and form components.

---

## Findings

### key-as-index-in-lists

The five findings below are all `<TableRow key={i}>` patterns over data that can be filtered, sorted, or refreshed. None of the rows carry component-local state, so the visible "state-sticks-to-wrong-item" bug is muted — but the reconciler still does avoidable work, and the moment any row gains internal state (focus, inline edit, expansion) the bug becomes user-visible. Switch to a composite stable key.

**Not findings (skipped, legitimate):** `PageSkeletons.tsx` (9 hits) — static loaders with no internal state; `DataTable.tsx:175,282` — column headers + render-result fragments; `KeyboardShortcutsProvider.tsx:199` — static help dialog; `CsvImportDialog.tsx:249,273` — headers + static error messages; `DashboardCharts.tsx:200` — static activity entries.

#### [src/features/reports/components/TurnoverTab.tsx:81](src/features/reports/components/TurnoverTab.tsx#L81)

```tsx
{data.data.map((r, i) => (
  <TableRow key={i}>
    <TableCell>{r.month}</TableCell>
    <TableCell>{r.departmentName}</TableCell>
    ...
```

`data.data` is a turnover report that can be filtered by year/department and refreshed. Suggested fix: `key={\`${r.month}-${r.departmentName}\`}` (composite stable key from already-displayed fields).

#### [src/features/reports/components/LeaveTab.tsx:90](src/features/reports/components/LeaveTab.tsx#L90)

```tsx
{data.data.map((r, i) => (
  <TableRow key={i}>
    <TableCell>{r.departmentName}</TableCell>
    <TableCell>{r.leaveTypeName}</TableCell>
    ...
```

Same pattern as TurnoverTab. Suggested fix: `key={\`${r.departmentName}-${r.leaveTypeName}\`}`.

#### [src/features/reports/components/HeadcountTab.tsx:82](src/features/reports/components/HeadcountTab.tsx#L82)

Same pattern over filterable headcount rows. Suggested fix: composite key from `month` + `departmentName`.

#### [src/features/reports/components/ReviewsTab.tsx:84](src/features/reports/components/ReviewsTab.tsx#L84)

Same pattern over reviews report rows. Suggested fix: composite key from displayed identifying fields.

#### [src/features/admin/components/CsvImportDialog.tsx:257](src/features/admin/components/CsvImportDialog.tsx#L257)

```tsx
{preview.rows.map((row, i) => (
  <TableRow key={i}>
    {row.map((cell, j) => (
      <TableCell key={j}>...
```

**Lower confidence** — CSV preview data is in file order and doesn't reorder, so the visible bug doesn't fire. Flagged for awareness only: if the dialog later gains row-level edit/delete, the index key becomes a real bug. Defer unless the dialog grows.

---

### useEffect-for-derived-state

No findings. The codebase prefers Server Components + `useActionState` for derivation; the few `useEffect` calls that _do_ call setters are:

- **Server-action result reactors** (`AddPersonForm.tsx:39`, `AddDepartmentForm.tsx:41`, `AddTeamForm.tsx:37`) — reset form fields after `state.success`. Reacting to a server result, not deriving state from state.
- **Ref-from-state sync** (`TutorialProvider.tsx:79`) — `completedStepsRef.current = completedSteps`. Refs aren't state; doesn't match the smell shape.
- **Hydration-deferred external read** (`ThemeRegistry.tsx:57`) — `setCurrentTheme(loadTheme())` on mount because `localStorage` is undefined during SSR. Legitimate hydration pattern.

**Minor note** (not a Check 2 finding, but worth flagging during human review): the three `useEffect(() => { if (state.success) setX("") })` patterns in `AddPersonForm`/`AddTeamForm`/`AddDepartmentForm` may be redundant — React 19's `<form action={action}>` auto-resets uncontrolled inputs, and the form fields here are controlled with `value=`. The reset is needed for _controlled_ fields, so the pattern is correct as written; just confirming the rationale isn't accidentally orphaned.

---

### dep-array-lies

No findings. The codebase has zero `// eslint-disable.*exhaustive-deps` comments. The eslint config (`eslint.config.mjs`) extends `nextPlugin.configs["core-web-vitals"]` which includes `react-hooks/exhaustive-deps` — meaning every dep-array drift is already caught at lint time. CI lint gate covers this check.

---

### state-mutation-instead-of-replace

No findings. Every `.push()` / `.sort()` / `.reverse()` hit was one of:

- `router.push(...)` calls (false positive on the regex — Next.js router, not array mutation)
- `acc[domain].push(...)` inside `Array.reduce` accumulator (local variable, not state)
- Utility functions in `orgChartUtils.tsx` building local arrays before return (not React state)
- `[...arr].sort()` / `[...new Set(...)].sort()` patterns that copy before sorting (correct pattern)
- `[...events].reverse().slice(0, MAX_VISIBLE)` in `ActivityFeed.tsx:53` — copy-then-reverse on derived array (correct)

The codebase consistently uses immutable update patterns.

---

### effect-cleanup-missing

#### [src/hooks/useRealtimeEvents.ts:53-104](src/hooks/useRealtimeEvents.ts#L53-L104) (SSE retry timer not cleared)

```tsx
es.onerror = () => {
  setConnected(false);
  es?.close();
  if (disposed) return;
  const delay = RECONNECT_DELAYS[Math.min(retryCount, RECONNECT_DELAYS.length - 1)];
  retryCount++;
  setTimeout(connect, delay); // ⚠️ pending timer not tracked, not cleared in cleanup
};
```

**Severity: minor.** The `disposed` flag set in the cleanup (line 100) prevents the timer's callback from creating a new `EventSource`, so there's no real leak of network resources. But the pending `setTimeout` itself isn't cancelled — the timer stays in the event loop until it fires (up to 16s for the last retry tier). On a busy app with rapid mount/unmount cycles, you accumulate unfired timers.

**Suggested fix:** track the retry timer in a variable and `clearTimeout` it in the cleanup:

```tsx
let retryTimer: ReturnType<typeof setTimeout> | null = null;
// ...inside es.onerror:
retryTimer = setTimeout(connect, delay);
// ...in cleanup:
return () => {
  disposed = true;
  if (retryTimer) clearTimeout(retryTimer);
  es?.close();
  setConnected(false);
};
```

**Not findings (skipped, have cleanup):** `useRealtimeEvents.ts:107` (poll interval); `TutorialCelebration.tsx:106` (setTimeout); `KeyboardShortcutsProvider.tsx:75` (keydown listener); `TutorialSpotlight.tsx:45` (MutationObserver); `TutorialProvider.tsx:134` (window event loop); `SetupDialog.tsx:219` (cancelled-flag async); `global-error.tsx:13` (Sentry capture, no resource).

---

### multiple-sources-of-truth

This check produced the largest finding count. The codebase has a consistent pattern of `useState(propValue)` for forms and search inputs. Two sub-categories below.

#### High-confidence (3) — URL search input state diverges from URL on back-button navigation

These three components mirror a `search` URL search-param into local state for an uncontrolled-input pattern. The browser back/forward buttons change the URL → re-render parent → `search` prop changes → `useState(search)` ignores it → SearchBar still shows the old (typed) value while the route now reflects something different.

##### [src/features/persons/components/OptimisticPersons.tsx:33](src/features/persons/components/OptimisticPersons.tsx#L33)

```tsx
const [inputValue, setInputValue] = useState(search); // ⚠️ never resyncs when `search` prop changes
```

**Reproducer:** type "alice" → URL becomes `?q=alice` → click browser back → URL becomes `?q=` but the search field still shows "alice".

**Suggested fix:** make the input fully controlled by URL state, OR use the URL search param as the source of truth and replace local state with a controlled `value={search}` + a debounced `router.replace` on `onChange`. Alternative: use `useEffect(() => setInputValue(search), [search])` to resync (the "useEffect-to-sync-with-prop" pattern is itself a known anti-pattern, but explicit; the React docs recommend a `key` reset instead).

##### [src/features/teams/components/OptimisticTeams.tsx:33](src/features/teams/components/OptimisticTeams.tsx#L33)

Same pattern as OptimisticPersons. Same fix.

##### [src/features/departments/components/OptimisticDepartments.tsx:33](src/features/departments/components/OptimisticDepartments.tsx#L33)

Same pattern as OptimisticPersons. Same fix.

#### Borderline (8) — `useState(currentX)` form initialization

The form-style components below all use `useState(currentName)` / `useState(profile.name ?? "")` etc. The prop names (`currentName`, `currentRole`, `profile.name`) don't match the `initial*`/`default*`/`seed*` heuristic, but the components' lifecycle does match the "initial value, then locally controlled" pattern:

- Update forms (`UpdatePersonNameForm`, etc.) navigate away via `router.push(...)` after success — the component unmounts before any prop change could reach it.
- The profile page (`/profile`) has no route params — navigating away and back remounts.
- The Next.js App Router remounts route segments when params change, so per-record forms don't re-receive a new `currentX` mid-mount.

The pattern is **fragile** (a future change to use `key` prop on the form, or in-place editing, would expose the bug), but currently has no user-visible failure path. Surfaced here for human judgement.

| File                                                           |  Line | State                 | Source prop                         |
| -------------------------------------------------------------- | ----: | --------------------- | ----------------------------------- |
| `src/features/profile/components/ProfileEditor.tsx`            |    37 | `nameValue`           | `profile.name`                      |
| `src/features/profile/components/ProfileEditor.tsx`            |    40 | `imageValue`          | `profile.image`                     |
| `src/features/persons/components/UpdatePersonNameForm.tsx`     |    24 | `newName`             | `currentName`                       |
| `src/features/persons/components/UpdatePositionForm.tsx`       |    26 | `newPosition`         | `currentPosition`                   |
| `src/features/persons/components/UpdateEmailForm.tsx`          |    26 | `newEmail`            | `currentEmail`                      |
| `src/features/departments/components/UpdateDepartmentForm.tsx` | 24-25 | `name`, `description` | `currentName`, `currentDescription` |
| `src/features/teams/components/UpdateTeamNameForm.tsx`         |    24 | `newName`             | `currentName`                       |
| `src/features/admin/components/RoleSelector.tsx`               |    53 | `selectedRole`        | `currentRole`                       |

**Suggested approach if you decide to fix:** rename the props to `initialName` / `initialRole` to make the "seed value" intent explicit (immunizes the pattern from this audit and signals intent to future readers), and document in the schema/type that downstream changes are managed locally until a server action commits.

---

## What this audit did NOT cover

- **Class components** — none in this codebase; modern React throughout.
- **Server Components** with hooks — the `"use client"` directive prefix scopes the audit to client code automatically. Pages and most route segments are async RSCs and were correctly skipped.
- **Memoization patterns** (`useMemo` / `useCallback` over- or under-use) — not part of v1's six checks.
- **Render-prop / context misuse** — not part of v1's six checks.
- **`react-hooks/rules-of-hooks` violations** — already enforced by the lint baseline.

## Next steps

1. **OptimisticPersons/Teams/Departments URL-sync bug** is the only finding with a concrete user-visible reproducer. Fix recommended before next release.
2. **Report-tab key-as-index** (5 hits) is low-impact today but becomes a real bug the moment any row gains state. Cheap fix; do alongside any reports work.
3. **SSE retry-timer leak** is minor; fix when next touching `useRealtimeEvents.ts`.
4. **Borderline `useState(currentX)` forms** (8 hits) — judgement call. Recommend renaming props to `initialX` for clarity if no other action is taken.
