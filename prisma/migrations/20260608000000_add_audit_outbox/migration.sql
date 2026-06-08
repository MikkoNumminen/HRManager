-- CreateTable
CREATE TABLE "AuditOutbox" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drainedAt" TIMESTAMP(3),

    CONSTRAINT "AuditOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditOutbox_drainedAt_id_idx" ON "AuditOutbox"("drainedAt", "id");

-- CreateIndex
CREATE INDEX "AuditOutbox_sessionId_idx" ON "AuditOutbox"("sessionId");

-- Seed the cutover flag (disabled) so it can be flipped on from the admin UI.
INSERT INTO "FeatureFlag" ("id", "name", "description", "enabled", "scope", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'audit-use-outbox',
    'Route audit-log writes through the transactional Postgres outbox + drainer',
    false,
    'GLOBAL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;
