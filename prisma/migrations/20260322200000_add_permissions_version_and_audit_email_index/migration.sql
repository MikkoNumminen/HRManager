-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissionsVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AuditLog_userEmail_idx" ON "AuditLog"("userEmail");
