-- AlterTable
ALTER TABLE "Loan" ADD COLUMN "rentalPeriod" TEXT;
ALTER TABLE "Loan" ADD COLUMN "requestedPickupAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "publishedYear" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "availability" TEXT NOT NULL DEFAULT 'available',
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "provenance" TEXT DEFAULT '[]',
    "summary" TEXT,
    "rating" INTEGER,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("authorId", "availability", "featured", "id", "isbn", "publishedYear", "rating", "status", "summary", "title") SELECT "authorId", "availability", "featured", "id", "isbn", "publishedYear", "rating", "status", "summary", "title" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
