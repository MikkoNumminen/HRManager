# TODO

Shared task list across all Claude Code sessions. After completing a task, note how long it took before removing it.
Every item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large.
In Progress items must show the owner: `[worktree-name]` or `[main]`.

## In Progress

- 🔴 Add dashboard page with MUI charts `[dashboard]`

- 🔴 Soft deletes — preserve historical audit trail on cascaded deletions `[snackbar-notifications]`
  - [ ] Add deletedAt column to Person, Team, Department, TeamMember + migration
  - [ ] Update all queries.ts to filter deletedAt: null
  - [ ] Update delete server actions to set deletedAt instead of DELETE
  - [ ] Handle cascade soft-deletes (Person → TeamMember rows)
  - [ ] Handle FK nulling (soft-deleted person as manager/head)
  - [ ] Update Zod schemas with optional deletedAt
  - [ ] Update tests + add soft-delete tests
  - [ ] Update README.md and CLAUDE.md

## Backlog

- 🟡 Optimistic updates
- 🔴 Demo session isolation — per-session data instead of shared DB
- 🔴 Mobile-first redesign
