-- DropIndex
DROP INDEX "Department_name_key";

-- DropIndex
DROP INDEX "Person_email_key";

-- DropIndex
DROP INDEX "Team_teamName_key";

-- Partial unique indexes: only enforce uniqueness for non-deleted records.
-- This allows soft-deleted records to retain their original values without
-- blocking new records with the same name/email.
CREATE UNIQUE INDEX "Person_email_active_key" ON "Person" ("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Team_teamName_active_key" ON "Team" ("teamName") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Department_name_active_key" ON "Department" ("name") WHERE "deletedAt" IS NULL;
