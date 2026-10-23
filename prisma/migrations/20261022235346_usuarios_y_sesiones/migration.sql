-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "userId" TEXT,
    "partnerOne" TEXT NOT NULL,
    "partnerTwo" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "ceremonyVenue" TEXT NOT NULL,
    "ceremonyAddress" TEXT NOT NULL,
    "ceremonyTime" TEXT NOT NULL,
    "receptionVenue" TEXT,
    "receptionAddress" TEXT,
    "receptionTime" TEXT,
    "dressCode" TEXT,
    "message" TEXT,
    "giftRegistry" TEXT,
    "musicUrl" TEXT,
    "rsvpDeadline" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'BASICO',
    "templateId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Wedding_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Wedding" ("adminToken", "ceremonyAddress", "ceremonyTime", "ceremonyVenue", "createdAt", "date", "dressCode", "giftRegistry", "id", "message", "musicUrl", "partnerOne", "partnerTwo", "plan", "receptionAddress", "receptionTime", "receptionVenue", "rsvpDeadline", "slug", "templateId") SELECT "adminToken", "ceremonyAddress", "ceremonyTime", "ceremonyVenue", "createdAt", "date", "dressCode", "giftRegistry", "id", "message", "musicUrl", "partnerOne", "partnerTwo", "plan", "receptionAddress", "receptionTime", "receptionVenue", "rsvpDeadline", "slug", "templateId" FROM "Wedding";
DROP TABLE "Wedding";
ALTER TABLE "new_Wedding" RENAME TO "Wedding";
CREATE UNIQUE INDEX "Wedding_slug_key" ON "Wedding"("slug");
CREATE UNIQUE INDEX "Wedding_adminToken_key" ON "Wedding"("adminToken");
CREATE INDEX "Wedding_userId_idx" ON "Wedding"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
