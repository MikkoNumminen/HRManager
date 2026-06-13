// Preflight for the server test suite (`npm run test:all` / `test:server`).
//
// Those scripts read `.env.test` (gitignored) to point Prisma at a TEST
// database, then run `prisma db push --accept-data-loss` against it. If neither
// `.env.test` nor a DATABASE_URL is present, `prisma db push` fails with a
// cryptic error — this turns that into an actionable message instead.
//
// CI has no `.env.test` but sets DATABASE_URL in the job environment, so the
// DATABASE_URL branch below keeps CI passing.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!existsSync(join(root, ".env.test")) && !process.env.DATABASE_URL) {
  console.error(
    [
      "test:all/test:server: no .env.test file and no DATABASE_URL in the environment.",
      "",
      "Create one from the template (points DATABASE_URL/DIRECT_URL at a TEST database):",
      "  cp .env.test.example .env.test",
      "",
      'See README → "Running tests locally". Never point it at your dev/prod DB —',
      "the suite runs `prisma db push --accept-data-loss`.",
    ].join("\n"),
  );
  process.exit(1);
}
