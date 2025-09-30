/*
  Warnings:

  - Added the required column `companyName` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "salaryRange" TEXT NOT NULL,
    "employmentType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applyLink" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "employerId" TEXT,
    CONSTRAINT "Job_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("applyLink", "city", "country", "createdAt", "description", "employerId", "employmentType", "expiresAt", "id", "salaryRange", "status", "title") SELECT "applyLink", "city", "country", "createdAt", "description", "employerId", "employmentType", "expiresAt", "id", "salaryRange", "status", "title" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
