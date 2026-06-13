# Security

HRManager is a portfolio / showcase HR system with a deliberately large
security surface (authN/Z, 2FA, multi-tenant demo isolation, an immutable audit
trail). This document is the front door for security: how to report an issue,
where the trust boundaries are, what controls exist, and the invariants an agent
**must not break** when editing.

## Reporting a vulnerability

Please report privately — **do not open a public issue** for a suspected
vulnerability. Use GitHub's **"Report a vulnerability"** (Security → Advisories)
on this repository to open a private advisory with the maintainer. Include the
affected file/endpoint, a reproduction, and the impact. As a showcase project
there is no formal SLA, but reports are triaged on a best-effort basis.

## Trust boundaries

Every request crosses these boundaries; treat data as untrusted until it has
passed the one to its left.

```
Browser ──HTTP──▶ proxy.ts (CSP + nonce, 2FA gate) ──▶ Next.js App Router
        ──▶ Server Component (read via features/*/queries.ts, Zod-validated)
        ──▶ Server Action (features/*/actions.ts, "use server")
              └─ requirePermission(key)   ← RBAC, server-side only
              └─ rateLimit(action)
              └─ prisma.$transaction(...)  ← integrity boundary
              └─ audit capture (inside the tx) ──▶ MongoDB hash chain
```

Untrusted inputs that deserve special care: OAuth provider callbacks, the
NextAuth **session-update** payload (client-driven — never trust it for
security-state transitions, see invariants), `FormData` in every action, CSV
uploads, and the unauthenticated-ish `/api/calendar`, `/api/realtime/*`,
`/api/health`, `/api/ready` endpoints.

## Security controls

| Area           | Control                                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication | NextAuth v5 (JWT). OAuth (Google/GitHub) + **opt-in** demo login (off unless `NEXT_PUBLIC_DEMO_LOGIN=true`).                                                                                                                               |
| 2FA            | TOTP (`otpauth`); secrets encrypted at rest (AES-256-GCM); 10 one-time recovery codes (hashed); enforced at the proxy, **including `/api/*` routes**.                                                                                      |
| Authorization  | 38 granular permission keys (`src/permissions.ts`) resolved into the JWT; per-user grant/deny overrides; all checks **server-side**.                                                                                                       |
| Audit trail    | Every mutation writes a before/after snapshot to MongoDB via a transactional outbox, with an **HMAC-SHA256 hash chain**; `/api/audit/verify` walks the chain. The HMAC key **fails closed** in production if `AUDIT_HMAC_SECRET` is unset. |
| Data integrity | All mutations run inside `prisma.$transaction()`; soft deletes (`deletedAt`) + partial unique indexes; no hard-delete path in normal operation.                                                                                            |
| Injection      | CSV exports routed through `generateCSV` (formula-injection escaping); CSV uploads reject binary content disguised by extension; Zod validation at boundaries.                                                                             |
| Multi-tenancy  | Demo sessions are isolated by `demoSessionId`; `resetAll` refuses to run outside a demo session; the audit-export worker scopes by `sessionId`.                                                                                            |
| Transport      | `proxy.ts` sets CSP (with per-request nonce) + security headers; HTTPS enforced by the host (Vercel).                                                                                                                                      |
| Secrets        | `.env.example` documents required vars; `CRON_SECRET` gates `/api/cron/*`; `AUDIT_HMAC_SECRET` keys the audit chain (generate fresh, never reuse/rotate casually).                                                                         |
| Rate limiting  | DB-backed `rateLimit(action)` on sensitive actions and TOTP verification.                                                                                                                                                                  |

## Security invariants (do not break these)

When editing the relevant files, preserve these — each one closed a real audit
finding:

1. **Never trust client-driven session state for security transitions.**
   `twoFactorVerified` is derived from server state, not from
   `useSession().update(...)` (`src/auth.ts`). Re-introducing client-trust is a
   full 2FA bypass.
2. **Demo login stays opt-in and demo queries stay session-scoped.** The demo
   user is powerful; every demo query must filter by `demoSessionId`, and
   destructive/org-wide actions must refuse to run with a null session.
3. **Audit writes happen inside the mutation transaction** (the outbox), so an
   action and its audit record commit or roll back together. Don't move audit
   capture outside the `$transaction`.
4. **The audit HMAC fails closed in production.** Don't add a hardcoded
   fallback secret.
5. **Migrations run on production deploys only** (`scripts/vercel-build.sh`) —
   never wire `prisma migrate deploy` into preview builds or pod startup.
6. **Security logic is server-side.** Permission checks, validation, and access
   control never move to the client.

## Verification in CI

Every PR runs (`.github/workflows/ci.yml`): format → lint → typecheck →
error-code i18n coverage → full test suite with coverage floors → `next build`,
plus Stryker mutation testing. The test suite includes permission/authz and
audit-chain coverage and runs against a real PostgreSQL + in-memory MongoDB.

## Audit history

The repository was audited on **2026-06-06** (robustness, security
attack-surface, AI-codegen smell, React anti-patterns — see
[`docs/audits/`](docs/audits/README.md); the detailed attack-surface report is
kept private because it contains exploit write-ups). The confirmed **critical
and high** findings — 2FA bypasses,
demo-login fail-open, HMAC fallback, `/api/*` 2FA exemption, cross-tenant
audit export, `resetAll` hard-delete, SSE resource exhaustion, CSV formula
injection, and more — were **remediated in PRs #14–#23** (e.g. commits
`edeba38`, `b7336be`, `1039d93`, `db73d65`, `7f91c69`, `3bb08ba`, `6da2178`,
`98e7635`, `d95d443`). Those dated reports are **historical snapshots** and
carry a superseded banner; treat their findings as closed unless re-confirmed.

### Known, accepted residual items

Tracked product/ops decisions, not open vulnerabilities: a unique index on
`Person.email` (currently a partial constraint), the NextAuth v5 beta pin, and a
set of low-severity dependency-version and CSP-hardening notes from the
attack-surface report. Revisit during a dedicated security pass.
