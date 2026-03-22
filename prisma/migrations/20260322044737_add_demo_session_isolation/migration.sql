-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "DemoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoSession_userId_idx" ON "DemoSession"("userId");

-- CreateIndex
CREATE INDEX "DemoSession_lastActiveAt_idx" ON "DemoSession"("lastActiveAt");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "Department_sessionId_idx" ON "Department"("sessionId");

-- CreateIndex
CREATE INDEX "Person_sessionId_idx" ON "Person"("sessionId");

-- CreateIndex
CREATE INDEX "Team_sessionId_idx" ON "Team"("sessionId");

-- CreateIndex
CREATE INDEX "TeamMember_sessionId_idx" ON "TeamMember"("sessionId");

-- AddForeignKey
ALTER TABLE "DemoSession" ADD CONSTRAINT "DemoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
