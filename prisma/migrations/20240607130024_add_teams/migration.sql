-- CreateTable
CREATE TABLE "Team" (
    "teamId" TEXT NOT NULL PRIMARY KEY,
    "teamName" TEXT NOT NULL,
    "teamManagerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
