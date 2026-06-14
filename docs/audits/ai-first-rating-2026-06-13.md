# AI-first rating — 2026-06-13

> **Latest measured score: 9.0 / 10** — 2026-06-14, post rounds 3–12, fresh
> adversarial re-measure on `main`. **All six dimensions at 9** (verifier-preferred):
> verifiability **9** · agent-context **9** · workflow **9** · safety-rails **9** ·
> doc-accuracy **9** · legibility **9**. Progression: 7.58 (round 3) → 8.17 → 8.38
> → 8.38 (plateau) → **8.83** (round 11 broke it by closing every dimension's
> named gap at once) → **9.0** (round 12 closed the last two: workflow + doc).
> Method note: verifiability/agent/safety/legibility were each scored 9 by an
> assessor+verifier pair in the post-r11 full re-measure (`66ab23f`) and round 12
> did not touch their surfaces; workflow + doc were independently re-confirmed at
> 9 after round 12 (`02110e6`). The path beyond 9 is documented but deliberately
> not taken (e.g. the prod-risky `Person.email` migration, extending Stryker over
> the DB-backed action layer) — those are the 9→10 frontier, not gaps.
>
> "AI-first" = how safely and cheaply a fresh autonomous coding agent (or new
> human) can orient, understand intent, make a correct change, and verify its
> own work in _this_ repo using only the repo's own docs and guardrails — no
> human in the loop. This doc defines the rubric, records the measured state,
> and is the trackable artifact for the score. Re-measure by re-running the
> assessment; append a new dated row to the History table rather than editing
> scores in place.

## Rubric

Six dimensions, each 0–10, equally weighted. Each was scored by an independent
assessor and then re-checked by a separate adversarial verifier that re-ran the
gates and re-grepped the claims. The number used is the **verifier's** score
(conservative). Two calibrations are baked in from the prior round's mistakes:
a mandatory checkout-verification preamble (two assessors once graded the stale
`~/koodailua/HRManager` decoy), and a single-suite test rule (one assessor once
manufactured a phantom "63 failing tests" by running jest concurrently).

> **The scorecard below is the round-3 _baseline_ (mean 7.58).** For the latest
> measured per-dimension scores, see the **Score history** table at the end —
> currently **9.0** (all six dimensions at 9). Several baseline rows below describe gaps since
> closed: `AGENTS.md` now exists and the multi-instance protocol now degrades to
> solo (row 2), and the two mutation patterns are now documented (row 6).

| #   | Dimension                             | Score    | One-line basis                                                                                                                                                                |
| --- | ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Verifiability & feedback loops        | 8.0      | Dense fast-failing CI ladder (format→lint→typecheck→error-codes→tests+coverage→build) + Stryker; gaps: no boundary lint, README-drift ungated, i18n only in a bypassable hook |
| 2   | Agent context & instructions          | 7.0      | Excellent CLAUDE.md + 4 skills, but Claude-branded; **no `AGENTS.md`**; multi-instance protocol doesn't degrade for a solo agent                                              |
| 3   | Workflow automation & reproducibility | 8.0      | Deterministic, self-measuring tooling; the one trap: `npm run test:all` needs a gitignored `.env.test` no doc explained                                                       |
| 4   | Safety rails & blast radius           | 7.5      | Strong runtime rails (guarded wrappers, hash-chained audit, 2FA gate, prod-only migrations, rollback runbook); module boundaries unenforced (22 cross-feature deep imports)   |
| 5   | Doc accuracy & drift                  | 7.5      | Numbers/paths verify almost exactly; five dated audit docs lacked superseded banners; a few stale README facts                                                                |
| 6   | Code legibility & consistency         | 7.5      | Near-zero typing escape hatches, WHY-comments, Zod contracts; two undocumented parallel mutation patterns across 18 features                                                  |
|     | **Overall (mean)**                    | **7.58** |                                                                                                                                                                               |

> The prior session reported ~8.0 (and estimated ~8.4–8.5 after PR #23). This
> fresh, un-anchored, adversarial re-measure landed lower at **7.58** — the
> assessors dug into gaps the targeted campaign didn't reach (`.env.test` setup,
> boundary non-enforcement, missing banners, the second mutation pattern). The
> lower number is the more honest baseline, not a regression.

## Round-3 changes (this PR) — what moves the score

All round-3 changes are **docs / contracts only** (zero behaviour or CI risk) —
appropriate for a maintenance-mode showpiece. Estimated per-dimension lift:

| Dimension            | → est.                 | What changed                                                                                                                                                                                                                                                   |
| -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent context        | 7.0 → **8.5**          | New `AGENTS.md` (canonical cross-tool contract: stack, architecture, gate ladder, footguns, commits); CLAUDE.md gains an `AGENTS.md` pointer + a solo-agent fallback for the instance protocol; fixed the stale `serverActions.ts` mermaid label               |
| Workflow automation  | 8.0 → **8.7**          | `.env.test.example` + a README "Running tests locally" block + AGENTS.md setup section close the gitignored-`.env.test` trap                                                                                                                                   |
| Doc accuracy & drift | 7.5 → **8.5**          | Superseded banners on the dated audit reports + this index (`docs/audits/README.md`) with remediation mapping; banner on the tracked, pre-refactor `REVIEW.md`; README fixes (`src/lib` infra location, `14`→`40+` indexes, Vercel-build migrate-deploy claim) |
| Safety rails         | 7.5 → **7.9**          | New `SECURITY.md` (trust boundaries, controls, 6 named security invariants, threat model, remediation history) + `CODEOWNERS` on security-sensitive paths; the boundary-enforcement lever is deferred (see below)                                              |
| Code legibility      | 7.5 → **8.0**          | The two mutation patterns (wrappers vs. inline `safe()`/manual-audit, used by `data`/`featureFlags`/`jobs`/`profile`/`sessions`) are now documented in CLAUDE.md + AGENTS.md                                                                                   |
| Verifiability        | 8.0 → 8.0              | Unchanged — the CI-gate levers are round-4 work (below)                                                                                                                                                                                                        |
| **Mean**             | **7.58 → ~8.3 (est.)** | re-run the rating to confirm                                                                                                                                                                                                                                   |

## Why module-boundary lint enforcement was _not_ added

The single highest-rated cross-repo lever (it took a sibling repo to 8.7) is an
ESLint `no-restricted-imports`/boundaries rule. It does **not** drop cleanly in
here: cross-feature imports of another feature's **public surface**
(`actions`/`queries`/`schemas`/top-level `components`) are pervasive and _by
design_ — 22 cross-feature import lines, and CLAUDE.md documents root barrels
(`@/queries`, `@/serverActions`, `@/schemas`) as the intended seam. A naïve
ban would fail the build and contradict the architecture. Enforcing it safely
first requires a small refactor (extract 2 shared components to
`src/components/shared/`, route the ~18 deep `actions`/`schemas` imports through
the existing barrels) — that's **round-4 code work**, not a docs PR.

## Next +points, in leverage order

**Round 4 shipped the three lowest-risk items** (code/CI, full suite verified
locally): an i18n-parity CI gate (+~0.3 verifiability — closes the gap a
`--no-verify`/headless push opened past the pre-push hook), a `test:all`
preflight that errors clearly when the test-DB env is missing (+~0.3 workflow),
and inline-mutation-pattern headers on the 5 wrapper-exempt action files (+~0.3
legibility).

Remaining (higher churn / risk):

1. **Boundary enforcement** (safety-rails). **Round 5 took the low-risk half:**
   a CI ratchet (`scripts/check-feature-boundaries.mjs`, `npm run
check:boundaries`) that fails the build if cross-feature imports (alias or
   relative) grow past the baseline (19 in production code) — convention is now
   mechanically enforced against regression, zero refactor. **Still deferred
   pending a go-ahead** (the bigger +~0.4): reduce the 19 to ~0 — extract 2
   shared components to `src/components/shared/`, route the deep `actions`/
   `schemas` imports through the root barrels — then tighten the ratchet toward 0
   (or swap it for a hard `no-restricted-imports` rule). That part is real
   structural churn in a maintenance-mode repo.
2. **Gate README/coverage drift in CI** (+~0.4 verifiability): a `--check` mode
   for `scripts/generate-test-table.mjs` reusing CI's Jest JSON + a coverage-cell
   check against `coverage/coverage-summary.json`, wired into `ci.yml`.
3. **Split the largest `actions.ts` files** (+~0.2 legibility): reviews (555),
   admin (515), leave (454).

## Method & caveats

- **Multi-agent, adversarially verified.** Six assessors (one per dimension) +
  six independent verifiers; 12 agents, ~508K tokens. No assessor landed on the
  decoy checkout this round (the verification preamble held).
- **Read-only, point-in-time.** Scores describe the working tree at `main`
  @ `366b997` on 2026-06-13. Round-3 "after" numbers are **estimates**, not a
  re-measure — re-run the assessment to capture the real lift.
- **Verifier-preferred scoring.** Where assessor and verifier disagreed, the
  (lower) verifier number is used. The overall mean is computed from those.

## Score history

| Date                              | Score                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-13                        | 7.58 (→ ~8.3 est. after round-3) | First **tracked** rating (this doc). Fresh adversarial re-measure; round-3 docs/contracts PR estimated to lift to ~8.3.                                                                                                                                                                                                                                                                                                     |
| 2026-06-13 (r4)                   | ~8.3 → ~8.5 est.                 | Round 4 (code/CI, full suite verified locally): i18n-parity CI gate, `test:all` preflight, 5 inline-mutation-pattern headers. Boundary refactor + README-drift gate still deferred. Re-measure to confirm.                                                                                                                                                                                                                  |
| 2026-06-13 (r5)                   | ~8.5 → ~8.6 est.                 | Round 5: CI feature-boundary ratchet (`check:boundaries`, baseline 19) — mechanical regression-guard on cross-feature imports. The reduce-to-0 refactor stays deferred. Re-measure to confirm.                                                                                                                                                                                                                              |
| 2026-06-13 (measured, post r3–5)  | **8.17 measured**                | Fresh adversarial re-measure on `main` @ `0f72284` (12 agents). Verifier-preferred per-dim: verifiability 8.0, agent-context 8.5, workflow 8.0, safety-rails 8.0, doc-accuracy 8.5, legibility 8.0. The earlier ~8.6 was an estimate; this is the honest measure. Round 6+ targets ≥9.                                                                                                                                      |
| 2026-06-14 (measured, post r3–8)  | **8.38 measured**                | Re-measure on `main` @ `a5ff5d9` (12 agents). Per-dim: verifiability 8.3, agent-context 8.5, workflow 8.0, safety-rails 8.5, doc-accuracy 8.5, legibility 8.5. Rounds 6–8 lifted verifiability (coverage gate), safety (PersonSelectCard→shared, baseline 16), legibility (TranslationFn typed + actions.ts splits). Round 9 (this) adds file-size + rounded-prose gates, Postgres align, doc fixes.                        |
| 2026-06-14 (measured, post r10)   | **8.38 measured**                | Re-measure @ `5d95b3b`. Per-dim 8.5/8.5/8.0/8.5/8.3/8.5 — flat despite real round-9/10 work (mutation-rails + test-count gates, mongo pin, optional instance ritual): skeptics kept finding new narrow gaps. The plateau.                                                                                                                                                                                                   |
| 2026-06-14 (measured, post r3–11) | **8.83 measured**                | Re-measure @ `66ab23f` (12 agents). Per-dim: verifiability **9**, agent-context **9**, workflow 8.5, safety **9**, doc-accuracy 8.5, legibility **9**. Round 11 broke the plateau by closing every dimension's named gap at once (typed permission throws, API mutation-rails, numeric mutation score in PR, .env/docker align, rubric-table caption). Round 12 targets the last two 8.5s (workflow + doc) for a clean 9.0. |
| 2026-06-14 (measured, post r3–12) | **9.0 measured**                 | Targeted re-confirm @ `02110e6`: workflow and doc-accuracy both independently scored **9** (assessor+verifier) after round 12 — setup.sh starts MongoDB + uses `migrate deploy`; AGENTS.md/README name all 7 CI ratchets. Combined with the four dimensions measured at 9 post-r11 and untouched since → **all six at 9, mean 9.0**. Target reached.                                                                        |
| 2026-06 (prior)                   | ~8.0 measured / ~8.4–8.5 est.    | Rounds 1–2 (PRs #14–#23): audit remediation, CI gates, 4 skills, rollback runbook. Recorded only in session transcripts — not a tracked artifact. Superseded by the un-anchored re-measure above.                                                                                                                                                                                                                           |
