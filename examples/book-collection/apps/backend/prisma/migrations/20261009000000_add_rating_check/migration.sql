-- RedefineTables (SQLite cannot ALTER TABLE ADD CONSTRAINT — recreate with CHECK)
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "isbn" TEXT,
    "publishedYear" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "rating" INTEGER,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rating_range" CHECK ("rating" BETWEEN 0 AND 5)
);
INSERT INTO "new_Book" SELECT "id", "title", "isbn", "publishedYear", "status", "summary", "rating", "authorId" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_isbn_key" ON "Book"("isbn");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
