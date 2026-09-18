import { type PrismaClient } from '@prisma/client';

const SCHEMA_SQL = [
  'CREATE TABLE IF NOT EXISTS "Author" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "bio" TEXT)',
  'CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "Book" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "isbn" TEXT, "publishedYear" INTEGER, "status" TEXT NOT NULL DEFAULT \'draft\', "summary" TEXT, "authorId" TEXT NOT NULL, CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  'CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "Loan" ("id" TEXT NOT NULL PRIMARY KEY, "loanedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "returnedAt" DATETIME, "userId" TEXT NOT NULL, "bookId" TEXT NOT NULL, CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  'CREATE TABLE IF NOT EXISTS "_BookToCategory" ("A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_BookToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "_BookToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
  'CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "Book_isbn_key" ON "Book"("isbn")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "_BookToCategory_AB_unique" ON "_BookToCategory"("A", "B")',
  'CREATE INDEX IF NOT EXISTS "_BookToCategory_B_index" ON "_BookToCategory"("B")',
];

export const seedDatabase = async (prisma: PrismaClient) => {
  for (const sql of SCHEMA_SQL) {
    await prisma.$executeRawUnsafe(sql);
  }

  await prisma.author.createMany({
    data: [
      { id: 'author-1', name: 'George Orwell', bio: 'English novelist and essayist.' },
      { id: 'author-2', name: 'J.R.R. Tolkien', bio: 'English writer and philologist.' },
      { id: 'author-3', name: 'Ursula K. Le Guin', bio: 'American author of speculative fiction.' },
    ],
  });

  await prisma.category.createMany({
    data: [
      { id: 'cat-1', name: 'Fiction', slug: 'fiction' },
      { id: 'cat-2', name: 'Science Fiction', slug: 'science-fiction' },
      { id: 'cat-3', name: 'Fantasy', slug: 'fantasy' },
      { id: 'cat-4', name: 'Classic', slug: 'classic' },
    ],
  });

  const statuses = ['draft', 'published', 'archived'];
  const authorIds = ['author-1', 'author-2', 'author-3'];

  for (let i = 1; i <= 30; i++) {
    const authorId = authorIds[(i - 1) % 3];
    const status = statuses[(i - 1) % 3];
    await prisma.book.create({
      data: {
        id: `book-${i}`,
        title: `Book Title ${i}`,
        isbn: `978-0-00-${String(i).padStart(6, '0')}-0`,
        publishedYear: 1970 + i,
        status,
        summary: `Summary of book ${i}. A compelling story.`,
        authorId,
        categories: {
          connect: [
            { id: `cat-${((i - 1) % 4) + 1}` },
            ...(i % 2 === 0 ? [{ id: `cat-${(i % 4) + 1}` }] : []),
          ],
        },
      },
    });
  }

  await prisma.user.createMany({
    data: [
      { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' },
      { id: 'user-2', name: 'Bob Jones', email: 'bob@example.com' },
      { id: 'user-3', name: 'Carol White', email: 'carol@example.com' },
      { id: 'user-4', name: 'David Brown', email: 'david@example.com' },
      { id: 'user-5', name: 'Eve Davis', email: 'eve@example.com' },
    ],
  });

  await prisma.loan.createMany({
    data: [
      { id: 'loan-1', userId: 'user-1', bookId: 'book-1', loanedAt: new Date('2024-01-10'), returnedAt: new Date('2024-01-24') },
      { id: 'loan-2', userId: 'user-2', bookId: 'book-3', loanedAt: new Date('2024-02-01'), returnedAt: null },
      { id: 'loan-3', userId: 'user-3', bookId: 'book-5', loanedAt: new Date('2024-02-15'), returnedAt: new Date('2024-03-01') },
      { id: 'loan-4', userId: 'user-1', bookId: 'book-7', loanedAt: new Date('2024-03-10'), returnedAt: null },
      { id: 'loan-5', userId: 'user-4', bookId: 'book-10', loanedAt: new Date('2024-03-20'), returnedAt: new Date('2024-04-05') },
      { id: 'loan-6', userId: 'user-5', bookId: 'book-12', loanedAt: new Date('2024-04-01'), returnedAt: null },
      { id: 'loan-7', userId: 'user-2', bookId: 'book-15', loanedAt: new Date('2024-04-15'), returnedAt: new Date('2024-04-29') },
      { id: 'loan-8', userId: 'user-3', bookId: 'book-18', loanedAt: new Date('2024-05-01'), returnedAt: null },
      { id: 'loan-9', userId: 'user-4', bookId: 'book-20', loanedAt: new Date('2024-05-10'), returnedAt: new Date('2024-05-24') },
      { id: 'loan-10', userId: 'user-5', bookId: 'book-25', loanedAt: new Date('2024-06-01'), returnedAt: null },
    ],
  });
};
