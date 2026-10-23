-- Las bodas pasan a ser eventos (con tipo) y se agregan las mesas.
-- Escrita a mano para conservar los datos: Prisma por sí solo borraría la tabla "Wedding".
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Eventos: se copian las bodas existentes como tipo BODA
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'BODA',
    "slug" TEXT NOT NULL,
    "adminToken" TEXT NOT NULL,
    "userId" TEXT,
    "honoreeOne" TEXT NOT NULL,
    "honoreeTwo" TEXT,
    "title" TEXT,
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
    CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "Event" (
    "id", "type", "slug", "adminToken", "userId", "honoreeOne", "honoreeTwo", "date",
    "ceremonyVenue", "ceremonyAddress", "ceremonyTime", "receptionVenue", "receptionAddress", "receptionTime",
    "dressCode", "message", "giftRegistry", "musicUrl", "rsvpDeadline", "plan", "templateId", "createdAt"
)
SELECT
    "id", 'BODA', "slug", "adminToken", "userId", "partnerOne", "partnerTwo", "date",
    "ceremonyVenue", "ceremonyAddress", "ceremonyTime", "receptionVenue", "receptionAddress", "receptionTime",
    "dressCode", "message", "giftRegistry", "musicUrl", "rsvpDeadline", "plan", "templateId", "createdAt"
FROM "Wedding";

-- Mesas
CREATE TABLE "EventTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventTable_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Invitados: weddingId → eventId, y la mesa asignada
CREATE TABLE "new_Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "tableId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "attending" INTEGER,
    "dietary" TEXT,
    "message" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Guest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "EventTable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guest" ("id", "eventId", "name", "phone", "seats", "token", "status", "attending", "dietary", "message", "respondedAt", "createdAt")
SELECT "id", "weddingId", "name", "phone", "seats", "token", "status", "attending", "dietary", "message", "respondedAt", "createdAt" FROM "Guest";
DROP TABLE "Guest";
ALTER TABLE "new_Guest" RENAME TO "Guest";
CREATE UNIQUE INDEX "Guest_token_key" ON "Guest"("token");
CREATE INDEX "Guest_eventId_idx" ON "Guest"("eventId");
CREATE INDEX "Guest_tableId_idx" ON "Guest"("tableId");

-- Solicitudes de diseño: weddingId → eventId
CREATE TABLE "new_DesignRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "colors" TEXT NOT NULL,
    "references" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECIBIDO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DesignRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DesignRequest" ("id", "eventId", "style", "colors", "references", "notes", "status", "createdAt")
SELECT "id", "weddingId", "style", "colors", "references", "notes", "status", "createdAt" FROM "DesignRequest";
DROP TABLE "DesignRequest";
ALTER TABLE "new_DesignRequest" RENAME TO "DesignRequest";
CREATE INDEX "DesignRequest_eventId_idx" ON "DesignRequest"("eventId");

DROP TABLE "Wedding";

CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE UNIQUE INDEX "Event_adminToken_key" ON "Event"("adminToken");
CREATE INDEX "Event_userId_idx" ON "Event"("userId");
CREATE INDEX "EventTable_eventId_idx" ON "EventTable"("eventId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
