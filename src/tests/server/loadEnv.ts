import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test for local test runs; CI sets DATABASE_URL via environment
config({ path: resolve(__dirname, "../../../.env.test"), override: true });

// Deterministic audit-log HMAC key for tests. Without it, any test that flips
// NODE_ENV=production would trip the prod-only "AUDIT_HMAC_SECRET must be set"
// guard in auditHashChain. The hash-chain tests are self-consistent, so the
// exact value is irrelevant — only that one is present.
process.env.AUDIT_HMAC_SECRET ??= "test-audit-hmac-secret";
