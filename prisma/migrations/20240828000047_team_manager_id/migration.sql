-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "teamId" TEXT NOT NULL PRIMARY KEY,
    "teamName" TEXT NOT NULL,
    "teamManagerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Team" ("createdAt", "teamId", "teamManagerId", "teamName", "updatedAt") SELECT "createdAt", "teamId", "teamManagerId", "teamName", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
CREATE UNIQUE INDEX "Team_teamName_key" ON "Team"("teamName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
