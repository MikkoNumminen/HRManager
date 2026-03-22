-- Fix partial unique indexes to account for demo session isolation.
-- Without this, two concurrent demo sessions cannot both seed "alice@example.com"
-- because the existing partial unique index enforces uniqueness across all sessions.
--
-- Split each index into two scopes:
--   Production: unique on (column) WHERE deletedAt IS NULL AND sessionId IS NULL
--   Demo:       unique on (column, sessionId) WHERE deletedAt IS NULL AND sessionId IS NOT NULL

-- Person email
DROP INDEX IF EXISTS "Person_email_active_key";
CREATE UNIQUE INDEX "Person_email_prod_active_key"
  ON "Person" ("email") WHERE "deletedAt" IS NULL AND "sessionId" IS NULL;
CREATE UNIQUE INDEX "Person_email_demo_active_key"
  ON "Person" ("email", "sessionId") WHERE "deletedAt" IS NULL AND "sessionId" IS NOT NULL;

-- Team name
DROP INDEX IF EXISTS "Team_teamName_active_key";
CREATE UNIQUE INDEX "Team_teamName_prod_active_key"
  ON "Team" ("teamName") WHERE "deletedAt" IS NULL AND "sessionId" IS NULL;
CREATE UNIQUE INDEX "Team_teamName_demo_active_key"
  ON "Team" ("teamName", "sessionId") WHERE "deletedAt" IS NULL AND "sessionId" IS NOT NULL;

-- Department name
DROP INDEX IF EXISTS "Department_name_active_key";
CREATE UNIQUE INDEX "Department_name_prod_active_key"
  ON "Department" ("name") WHERE "deletedAt" IS NULL AND "sessionId" IS NULL;
CREATE UNIQUE INDEX "Department_name_demo_active_key"
  ON "Department" ("name", "sessionId") WHERE "deletedAt" IS NULL AND "sessionId" IS NOT NULL;
