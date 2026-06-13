# Audits & ratings — index and remediation status

Dated reports in this directory (and `docs/security/`) are **point-in-time
snapshots**, not live task lists. This index records which rounds have been
remediated and where, so an agent browsing `docs/audits/` sees the current
status without chasing already-fixed findings.

| Report                                                                             | Date       | Status                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| robustness audit — _kept local, not committed_                                     | 2026-06-06 | **Remediated** (critical/high fixed in #14–#23; medium/low triaged). Enumerates security findings with file:line, so kept out of this public repo; living posture in [`SECURITY.md`](../../SECURITY.md). |
| security attack-surface (Phase 1) — _kept local, not committed_                    | 2026-06-06 | **Remediated** (critical/high). The detailed report carries step-by-step exploit write-ups, so it is kept out of this public repo; the living posture is in [`SECURITY.md`](../../SECURITY.md).          |
| [`ai-smell-2026-06-06.md`](ai-smell-2026-06-06.md) — AI-codegen smells             | 2026-06-06 | Reviewed; confirmed items addressed during the #14–#23 campaign.                                                                                                                                         |
| [`react-anti-patterns-2026-06-06.md`](react-anti-patterns-2026-06-06.md)           | 2026-06-06 | Reviewed; confirmed items addressed during the #14–#23 campaign.                                                                                                                                         |
| audit suite — _kept local, not committed_                                          | 2026-06-06 | Aggregates the security/robustness findings, so kept local too. This `README.md` is the committed index.                                                                                                 |
| [`ai-first-rating-2026-06-13.md`](ai-first-rating-2026-06-13.md) — AI-first rating | 2026-06-13 | **Living.** The trackable AI-first score + rubric. Re-measure and append a history row.                                                                                                                  |

## What "remediated" means here

The 2026-06-06 audits found 2 critical + 3 high (security attack-surface) and a
matching set in the robustness audit (2FA bypasses, demo-login fail-open, HMAC
fallback, `/api/*` 2FA exemption, cross-tenant audit export, `resetAll`
hard-delete, SSE exhaustion, CSV formula injection, …). Every confirmed
critical/high was fixed across **PRs #14–#23** — representative commits:
`edeba38` (derive `twoFactorVerified` from server state), `b7336be` (opt-in demo
login), `1039d93` (HMAC fail-closed), `db73d65` (`/api/*` 2FA gate), `7f91c69`
(scope audit-export by `sessionId`), `3bb08ba` (refuse `resetAll` outside demo),
`6da2178` (production-only migrations), `98e7635` (gate SSE/poll), `d95d443`
(CSV via `generateCSV`).

The reports that enumerate security findings with `file:line` (robustness,
audit suite, attack-surface) are **kept local, not committed** to this public
repo — only the code-quality reports (AI-codegen smell, React anti-patterns) and
this index are tracked. Each dated report carries a superseded banner. Older
root-level reports (`AUDIT_REPORT.md`, `AUDIT_RESULTS.md`, `REVIEW.md`,
`REFACTOR_PLAN.md`, dated 2026-03) predate the feature-module refactor and are
historical.
