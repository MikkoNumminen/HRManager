# Audit suite — 2026-06-06

> **⚠️ Historical snapshot — 2026-06-06.** This report records the repo's state on its run date.
> The confirmed **critical/high** findings were remediated in PRs #14–#23; medium/low items were
> triaged and either fixed or parked. Do **not** treat findings here as open work without
> re-confirming against current `main`. Living status: [`SECURITY.md`](../../SECURITY.md),
> [`docs/audits/README.md`](README.md), and the AI-first rating doc.

**Scope:** project root (`/Users/mikko/koodailua/publicHRM/HRManager`)
**Detected shape:** TypeScript + React 19 + Next.js 16 + Prisma 7 + PostgreSQL + MongoDB + NextAuth 5 beta + 2FA (otpauth). 251 .tsx files. Heavy security surface.
**Audits run:** 4 of 4 (1 ⏸ gated)
**Method:** ultracode workflows — 5–10 parallel sub-agent finders per audit, adversarial verify gates (3-vote on critical/high security findings, single-vote on robustness)

## Reports

| Audit                     | Status  | Report                                                                               |                                 Findings |
| ------------------------- | ------- | ------------------------------------------------------------------------------------ | ---------------------------------------: |
| react-anti-patterns-audit | ✅ ok   | [react-anti-patterns-2026-06-06.md](react-anti-patterns-2026-06-06.md)               |                                       17 |
| ai-codegen-smell-audit    | ✅ ok   | [ai-smell-2026-06-06.md](ai-smell-2026-06-06.md)                                     |            40 (4 high + 17 med + 19 low) |
| audit (robustness)        | ✅ ok   | [audit-2026-06-06.md](audit-2026-06-06.md)                                           | 105 (6 crit + 25 high + 44 med + 30 low) |
| security-audit            | ⏸ gated | [../security/attack-surface-2026-06-06.md](../security/attack-surface-2026-06-06.md) |                       145 (Phase 1 only) |

## Aggregate severity rollup

Counting only the highest-severity copy of each finding (de-duplicating overlaps across audits):

| Severity |    Count | Notes                                                                                                                                         |
| -------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| critical |    **8** | 6 from robustness audit + 2 distinct from security audit. All security/integrity. Several cross-confirmed by independent finders.             |
| high     |  **~30** | 4 from ai-codegen + 25 from robustness + 1 distinct from security audit. Distributed across data integrity, error paths, external boundaries. |
| medium   | **~125** | Mostly auto-accepted; not adversarially verified. Reliable but lower-impact.                                                                  |
| low      | **~120** | Cleanup hygiene + dep version pins + missing observability headers.                                                                           |

> **Verifier caveat:** the security audit's verifier had widespread infrastructure failures (~150 stalls / missing outputs); some real critical/high security findings were dropped from its confirmed list. The robustness audit confirms most of them independently, so they're carried forward in the "Top critical findings" section below despite missing the security audit's gate.

## Top critical findings (read these first)

All have file:line citations in the linked reports.

### Security-critical (fix this week)

1. **🔴 HMAC audit-chain secret falls back to a hardcoded dev string** — [src/lib/auditHashChain.ts:9](../../src/lib/auditHashChain.ts#L9). Audit-chain tamper-detection is **disabled by default** in any prod deployment that forgets the env var. README claims "auto-generated" — it isn't.

2. **🔴 Demo Credentials provider enabled by default with superuser role** — [src/auth.ts:41](../../src/auth.ts#L41). Any prod deployment missing `NEXT_PUBLIC_DEMO_LOGIN=false` ships a "click for superuser" button on `/auth/signin`. Combined with the shared User row, every demo login uses the same `superuser` identity.

3. **🔴 Client trusts `twoFactorVerified` from `useSession().update(...)`** — [src/auth.ts:131](../../src/auth.ts#L131). 2FA-required user can run `getSession().update({ twoFactorVerified: true })` in console and bypass the gate. (CWE-602)

4. **🔴 `verifyTwoFactorLogin` silently returns success when TFA disabled** — [src/features/twoFactor/actions.ts:259](../../src/features/twoFactor/actions.ts#L259). Stale JWT + admin-reset TFA → full auth bypass with any submitted code.

5. **🔴 `/api/*` routes exempt from 2FA enforcement** — [src/proxy.ts:60](../../src/proxy.ts#L60). `/api/calendar`, `/api/audit/verify`, `/api/realtime/*` all readable while `twoFactorVerified=false`.

6. **🔴 Audit-export worker doesn't filter by sessionId** — [src/jobs/workers/auditExport.ts:40](../../src/jobs/workers/auditExport.ts#L40). Cross-tenant audit log exfiltration via the background job system. Bypasses scoping every other audit-log read path carefully enforces.

### Data-integrity-critical (fix before next deploy)

7. **🔴 `resetAll` hard-deletes org-wide production data** — [src/features/admin/actions.ts:39](../../src/features/admin/actions.ts#L39). `getDemoSessionId()` returns null for non-demo callers; the `where: { sessionId: null }` clause then wipes every org-wide row. Audit log captures only counts; reconstruction impossible.

### Operational-critical (mostly fixed by environment hygiene)

8. **🔴 `prisma migrate deploy` runs on every Vercel build (including PR previews)** — [package.json:7](../../package.json#L7). If preview deployments share the production `DATABASE_URL`, a destructive migration on a feature branch ships before review. Verify `DATABASE_URL` is scoped per Vercel environment.

## Cross-cutting patterns that appear in multiple reports

These show up in 2+ audit reports as different framings of the same underlying issue. Worth treating as a single workstream.

### Pattern A — observability is silently degraded

- `captureServerActionError` is defined ([src/lib/sentryCapture.ts](../../src/lib/sentryCapture.ts)) but **dead code** — used only by `global-error.tsx` ([ai-smell #unused-or-dead](ai-smell-2026-06-06.md), [robustness #error-paths](audit-2026-06-06.md))
- `safe()` returns raw `error.message` to client AND skips Sentry capture ([robustness #high, security #medium x3](audit-2026-06-06.md))
- `instrumentation.ts` doesn't export `onRequestError` — Server Component errors never reach Sentry ([robustness #high](audit-2026-06-06.md))
- Multiple bare `catch {}` blocks across 2FA, audit logging, realtime ([ai-smell #swallowed-errors x8](ai-smell-2026-06-06.md))

**Single workstream:** wire `captureServerActionError` into `safe()`, export `onRequestError`, replace bare catches with logged catches. ~1 day of work, instantly recovers production observability across server actions, RSCs, and background work.

### Pattern B — 2FA correctness is multi-system fragile

- Client-trusted `twoFactorVerified` flag (CWE-602, critical)
- `verifyTwoFactorLogin` silent success when disabled (critical)
- `/api/*` 2FA gate bypass (critical)
- `twoFactorRequired` not refreshed in lightweight JWT path (high)
- 30 attempts/min rate limit on TOTP verify — brute-force in 5.5h (high)
- Recovery-code consumption read-modify-write outside transaction (medium)
- Recovery codes plain SHA-256, no salt, no slow KDF (medium)
- TOTP encryption key reuses NEXTAUTH_SECRET (medium)
- TOTP secret + recovery codes round-trip through client FormData (medium)
- TOTP replay possible within validity window (medium)

**Single workstream:** an end-to-end 2FA review. 4 of 8 criticals plus 5+ mediums all share the 2FA surface. Worth a focused 2-3 day pass.

### Pattern C — cross-DB consistency between Postgres and MongoDB is best-effort

- Audit-log writes deferred via `after()`; PG commits succeed without audit when Mongo unavailable ([robustness #high](audit-2026-06-06.md))
- Hash-chain forks under concurrent writes (race on `getLatestHash`) ([robustness #high](audit-2026-06-06.md))
- Demo session cleanup deletes Mongo audit logs BEFORE PG transaction commits ([robustness #medium](audit-2026-06-06.md))
- MongoDB collection validator uses `validationAction: "warn"` ([robustness #medium](audit-2026-06-06.md))
- `disconnectMongo()` never wired to SIGTERM/SIGINT ([robustness #medium](audit-2026-06-06.md))

**Single workstream:** an audit-log outbox pattern (PG staging table → worker → MongoDB) addresses 3 of these and fixes the "forensic-grade" hash-chain claim. ~2 days.

### Pattern D — input validation gaps cluster on the reviews feature

- `addReviewRequest` no UUID validation on subjectId/reviewerId/cycleId (3 occurrences across reports)
- `createReviewCycle` no UUID validation on templateId
- `submitReview` JSON.parses raw `answers`, writes to Prisma JSON column without ReviewAnswerSchema validation
- `addReviewQuestion` no max-length on text, no rating bounds
- `removeReviewRequest` hard-deletes with FK cascade — destroys submitted answers

**Single workstream:** a reviews-feature hardening sprint. All 5 are in [src/features/reviews/actions.ts](../../src/features/reviews/actions.ts) and the existing `ReviewAnswerSchema` already covers most of what's needed. ~half a day.

### Pattern E — dead/abandoned code clusters in jobs + shared error infrastructure

- `SentryErrorBoundary` is an orphan component (high)
- `captureServerActionError` is dead code
- `retryFailedJob`/`cancelJob` server actions: built with full auth+rate-limit boilerplate, no UI
- `getRecentJobs`/`getJobById` queries: barrel-re-exported, no consumers
- `getUserTwoFactorAuth`: barrel-re-exported, no consumers (sibling `isUserTwoFactorEnabled` is used)
- `getEnabledFlags`: speculative batch helper, no callers
- `createRequestLogger`: 1-line wrapper, no callers
- `dbQueryDuration`: histogram exported, no `.record()` calls

**Single workstream:** delete-or-use pass on `src/features/jobs/*` and `src/lib/sentryCapture.ts`/`SentryErrorBoundary.tsx`/`logger.ts:37`. Each deletion is a small PR. Or use them — `captureServerActionError` is what fixes Pattern A above.

## What this index is NOT

- **Not a synthesis of findings across reports.** The reports each stand on their own. This index is a table of contents + the cross-cutting patterns where multiple reports converged.
- **Not a remediation plan.** Phase 2 of the security audit would produce one; it's currently gated.
- **Not a guarantee of completeness.** The verifier infrastructure failures in the security audit dropped real critical/high findings. The robustness audit's overlap covers some of them; others remain unverified-but-likely-real.

## Next steps

1. **Triage the 8 critical findings** — these are the only items that justify dropping other work. Most are 1–2 line code changes.
2. **Run the 5 cross-cutting workstreams above** in roughly the order shown — Pattern A unlocks observability for everything that follows.
3. **Decide whether to resume Phase 2** of the security audit. If yes, invoke `/mikko-security-audit` directly (not via the suite); it will resume from this Phase 1 output and produce the prioritized remediation plan.
4. **Re-run the security audit's failed verifiers** before Phase 2 starts. Either by re-invoking this workflow with a smaller verifier surface or by hand-verifying the candidates that didn't make it through.

## Workflow costs

| Audit               |       Sub-agents | Tokens | Wall-clock |
| ------------------- | ---------------: | -----: | ---------: |
| react-anti-patterns | main thread only |   ~18K |     ~3 min |
| ai-codegen-smell    |               52 |   1.6M |     33 min |
| robustness          |               49 |   1.8M |     50 min |
| security Phase 1    |              178 |   2.0M |   11.4h \* |

\* Most of the security-audit wall-clock was spent in stalled verifier sub-agents that eventually timed out. With the verifier infrastructure tuned (1-vote, simpler prompts), this would drop to ~1h.

**Total spend:** ~280 sub-agents, ~5.4M tokens. This is the most expensive audit invocation in the catalog as documented.
