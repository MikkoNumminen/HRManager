-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Department_deletedAt_idx" ON "Department"("deletedAt");

-- CreateIndex
CREATE INDEX "Person_deletedAt_idx" ON "Person"("deletedAt");

-- CreateIndex
CREATE INDEX "Team_deletedAt_idx" ON "Team"("deletedAt");

-- CreateIndex
CREATE INDEX "TeamMember_deletedAt_idx" ON "TeamMember"("deletedAt");
