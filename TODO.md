# TODO

Shared task list across all Claude Code sessions. After completing a task, note how long it took before removing it.
Every item must have a size estimate: 🟢 small, 🟡 medium, 🔴 large.
In Progress items must show the owner: `[worktree-name]` or `[main]`.

**NOTE:** 3 Claude instances run in parallel. Always re-read TODO.md before presenting tasks. Maintain this list carefully — other Claudes depend on it.

## In Progress

- 🔴 Mobile-first redesign `[main]`
  - [x] TopBar: hamburger menu + drawer for mobile navigation
  - [x] Tables: card/list view on mobile (< sm breakpoint)
  - [ ] Forms: full-width inputs, responsive button layout
  - [ ] AuditLogViewer: collapsible filters, card view for entries
  - [ ] Layout: responsive container + manage page padding
  - [ ] muiStyles.ts: add mobile-first responsive tokens
  - [ ] Tests for new responsive behavior
  - [ ] Update README.md and CLAUDE.md

## Backlog

- 🟡 Optimistic updates
- 🔴 Demo session isolation — per-session data instead of shared DB
