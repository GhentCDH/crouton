import { type PrismaClient } from '@prisma/client';

const SCHEMA_SQL = [
  'CREATE TABLE IF NOT EXISTS "Author" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "bio" TEXT)',
  'CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "Book" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "isbn" TEXT, "publishedYear" INTEGER, "status" TEXT NOT NULL DEFAULT \'draft\', "summary" TEXT, "rating" INTEGER, "authorId" TEXT NOT NULL, CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "rating_range" CHECK ("rating" BETWEEN 0 AND 5))',
  'CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS "Loan" ("id" TEXT NOT NULL PRIMARY KEY, "loanedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "returnedAt" DATETIME, "userId" TEXT NOT NULL, "bookId" TEXT NOT NULL, CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Loan_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)',
  'CREATE TABLE IF NOT EXISTS "_BookToCategory" ("A" TEXT NOT NULL, "B" TEXT NOT NULL, CONSTRAINT "_BookToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "_BookToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE)',
  'CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "Book_isbn_key" ON "Book"("isbn")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")',
  'CREATE UNIQUE INDEX IF NOT EXISTS "_BookToCategory_AB_unique" ON "_BookToCategory"("A", "B")',
  'CREATE INDEX IF NOT EXISTS "_BookToCategory_B_index" ON "_BookToCategory"("B")',
];

const BOOKS: Array<{
  id: string;
  title: string;
  isbn?: string;
  publishedYear: number;
  status: string;
  summary: string;
  rating: number;
  authorId: string;
  catA: string;
  catB?: string;
}> = [
  // Suske en Wiske (Willy Vandersteen) — author-1
  { id: 'book-1',  title: 'De Ruimteslee',                           isbn: '9789002270253', publishedYear: 1964, status: 'draft',     summary: 'Suske en Wiske reizen door de ruimte.',                   rating: 4, authorId: 'author-1', catA: 'cat-1', catB: 'cat-4' },
  { id: 'book-2',  title: 'De Vliegende Aap',                        isbn: '9789002270246', publishedYear: 1952, status: 'published', summary: 'Een ongewone aap brengt chaos.',                           rating: 3, authorId: 'author-1', catA: 'cat-1' },
  { id: 'book-3',  title: 'De Nerveuze Neushoorn',                   isbn: '9789002270239', publishedYear: 1968, status: 'archived',  summary: 'Een neushoorn zaait angst.',                              rating: 3, authorId: 'author-1', catA: 'cat-1', catB: 'cat-4' },
  { id: 'book-4',  title: 'De Stalen Bloempot',                      isbn: undefined,       publishedYear: 1971, status: 'draft',     summary: 'Een magische bloempot met geheimen.',                     rating: 2, authorId: 'author-1', catA: 'cat-1' },
  { id: 'book-5',  title: 'De Sneeuwwolf',                           isbn: undefined,       publishedYear: 1973, status: 'published', summary: 'Suske en Wiske ontmoeten een mysterieuze wolf.',          rating: 4, authorId: 'author-1', catA: 'cat-1', catB: 'cat-3' },

  // J.R.R. Tolkien — author-2
  { id: 'book-6',  title: 'The Hobbit',                              isbn: '9780618260300', publishedYear: 1937, status: 'archived',  summary: 'Bilbo Baggins sets out on an unexpected journey.',         rating: 5, authorId: 'author-2', catA: 'cat-3', catB: 'cat-1' },
  { id: 'book-7',  title: 'The Fellowship of the Ring',              isbn: '9780618346257', publishedYear: 1954, status: 'draft',     summary: 'Frodo inherits the One Ring.',                            rating: 5, authorId: 'author-2', catA: 'cat-3' },
  { id: 'book-8',  title: 'The Two Towers',                          isbn: '9780618346264', publishedYear: 1954, status: 'published', summary: 'The Fellowship is broken.',                               rating: 5, authorId: 'author-2', catA: 'cat-3', catB: 'cat-1' },
  { id: 'book-9',  title: 'The Return of the King',                  isbn: '9780618346271', publishedYear: 1955, status: 'archived',  summary: 'The final battle for Middle-earth.',                      rating: 5, authorId: 'author-2', catA: 'cat-3' },
  { id: 'book-10', title: 'The Silmarillion',                        isbn: '9780048231536', publishedYear: 1977, status: 'draft',     summary: 'The mythology of Middle-earth.',                          rating: 4, authorId: 'author-2', catA: 'cat-3', catB: 'cat-4' },

  // Homer — author-3
  { id: 'book-11', title: 'The Iliad',                               isbn: '9780140447941', publishedYear: -750, status: 'published', summary: 'The Trojan War through the wrath of Achilles.',           rating: 5, authorId: 'author-3', catA: 'cat-4', catB: 'cat-1' },
  { id: 'book-12', title: 'The Odyssey',                             isbn: '9780140268867', publishedYear: -720, status: 'archived',  summary: 'Odysseus returns home after the Trojan War.',             rating: 5, authorId: 'author-3', catA: 'cat-4' },

  // Donald Knuth — author-4
  { id: 'book-13', title: 'The Art of Computer Programming Vol. 1',  isbn: '9780201896831', publishedYear: 1968, status: 'draft',     summary: 'Fundamental algorithms.',                                 rating: 5, authorId: 'author-4', catA: 'cat-2' },
  { id: 'book-14', title: 'The Art of Computer Programming Vol. 2',  isbn: '9780201896848', publishedYear: 1969, status: 'published', summary: 'Seminumerical algorithms.',                               rating: 5, authorId: 'author-4', catA: 'cat-2', catB: 'cat-4' },
  { id: 'book-15', title: 'The Art of Computer Programming Vol. 3',  isbn: '9780201896855', publishedYear: 1973, status: 'archived',  summary: 'Sorting and searching.',                                  rating: 5, authorId: 'author-4', catA: 'cat-2' },
  { id: 'book-16', title: 'Concrete Mathematics',                    isbn: '9780201558029', publishedYear: 1989, status: 'draft',     summary: 'A foundation for computer science.',                      rating: 4, authorId: 'author-4', catA: 'cat-2', catB: 'cat-4' },

  // Martin Fowler — author-5
  { id: 'book-17', title: 'Refactoring',                             isbn: '9780201485677', publishedYear: 1999, status: 'published', summary: 'Improving the design of existing code.',                  rating: 5, authorId: 'author-5', catA: 'cat-2' },
  { id: 'book-18', title: 'Patterns of Enterprise Application Architecture', isbn: '9780321127426', publishedYear: 2002, status: 'archived', summary: 'Enterprise architecture patterns.',           rating: 4, authorId: 'author-5', catA: 'cat-2', catB: 'cat-4' },
  { id: 'book-19', title: 'Domain-Specific Languages',               isbn: '9780321712943', publishedYear: 2010, status: 'draft',     summary: 'Building and using DSLs.',                               rating: 4, authorId: 'author-5', catA: 'cat-2' },
  { id: 'book-20', title: 'UML Distilled',                           isbn: '9780321193681', publishedYear: 2003, status: 'published', summary: 'A brief guide to the standard object modeling language.', rating: 3, authorId: 'author-5', catA: 'cat-2', catB: 'cat-4' },

  // More Suske en Wiske
  { id: 'book-21', title: 'De Dolle Musketiers',                     isbn: undefined,       publishedYear: 1954, status: 'archived',  summary: 'Een avontuur met musketiers.',                            rating: 3, authorId: 'author-1', catA: 'cat-1' },
  { id: 'book-22', title: 'De Zwarte Madam',                         isbn: undefined,       publishedYear: 1957, status: 'draft',     summary: 'Een mysterieuze vrouw in het zwart.',                    rating: 2, authorId: 'author-1', catA: 'cat-1', catB: 'cat-4' },

  // More Tolkien
  { id: 'book-23', title: 'Unfinished Tales',                        isbn: '9780048231789', publishedYear: 1980, status: 'published', summary: 'Tales from the history of Middle-earth.',                 rating: 4, authorId: 'author-2', catA: 'cat-3' },
  { id: 'book-24', title: 'The Children of Húrin',                   isbn: '9780007246229', publishedYear: 2007, status: 'archived',  summary: 'The tale of Túrin Turambar.',                            rating: 4, authorId: 'author-2', catA: 'cat-3', catB: 'cat-1' },
  { id: 'book-25', title: 'Beren and Lúthien',                       isbn: '9780008214197', publishedYear: 2017, status: 'draft',     summary: 'The great love story of Middle-earth.',                  rating: 4, authorId: 'author-2', catA: 'cat-3' },

  // More Homer
  { id: 'book-26', title: 'The Theogony',                            isbn: '9780140442250', publishedYear: -700, status: 'published', summary: 'The origin of the gods by Hesiod (attributed).',          rating: 4, authorId: 'author-3', catA: 'cat-4', catB: 'cat-1' },

  // More Knuth
  { id: 'book-27', title: 'The Art of Computer Programming Vol. 4A', isbn: '9780201038040', publishedYear: 2011, status: 'archived',  summary: 'Combinatorial algorithms, part 1.',                      rating: 5, authorId: 'author-4', catA: 'cat-2' },

  // More Fowler
  { id: 'book-28', title: 'Analysis Patterns',                       isbn: '9780201895421', publishedYear: 1996, status: 'draft',     summary: 'Reusable object models.',                                rating: 3, authorId: 'author-5', catA: 'cat-2', catB: 'cat-4' },
  { id: 'book-29', title: 'The Fall of Gondolin',                    isbn: '9780008302757', publishedYear: 2018, status: 'published', summary: 'The most devastating battle of the First Age.',           rating: 4, authorId: 'author-2', catA: 'cat-3' },
  { id: 'book-30', title: 'De Toverfluit',                           isbn: undefined,       publishedYear: 1960, status: 'archived',  summary: 'Een betoverde fluit zaait verwarring.',                  rating: 2, authorId: 'author-1', catA: 'cat-1' },
];

export const seedDatabase = async (prisma: PrismaClient) => {
  for (const sql of SCHEMA_SQL) {
    await prisma.$executeRawUnsafe(sql);
  }

  // Junction table has no typed model — must use raw SQL
  await prisma.$executeRawUnsafe('DELETE FROM "_BookToCategory"');
  await prisma.$transaction([
    prisma.loan.deleteMany(),
    prisma.book.deleteMany(),
    prisma.user.deleteMany(),
    prisma.category.deleteMany(),
    prisma.author.deleteMany(),
  ]);

  await prisma.author.createMany({
    data: [
      { id: 'author-1', name: 'Willy Vandersteen', bio: 'Belgian cartoonist, creator of Suske en Wiske.' },
      { id: 'author-2', name: 'J.R.R. Tolkien',    bio: 'English writer and philologist.' },
      { id: 'author-3', name: 'Homer',              bio: 'Ancient Greek poet, author of the Iliad and the Odyssey.' },
      { id: 'author-4', name: 'Donald Knuth',       bio: 'American computer scientist, author of The Art of Computer Programming.' },
      { id: 'author-5', name: 'Martin Fowler',      bio: 'British software engineer and author.' },
    ],
  });

  await prisma.category.createMany({
    data: [
      { id: 'cat-1', name: 'Fiction',         slug: 'fiction' },
      { id: 'cat-2', name: 'Science Fiction', slug: 'science-fiction' },
      { id: 'cat-3', name: 'Fantasy',         slug: 'fantasy' },
      { id: 'cat-4', name: 'Classic',         slug: 'classic' },
    ],
  });

  for (const book of BOOKS) {
    await prisma.book.create({
      data: {
        id:            book.id,
        title:         book.title,
        isbn:          book.isbn ?? null,
        publishedYear: book.publishedYear,
        status:        book.status,
        summary:       book.summary,
        rating:        book.rating,
        authorId:      book.authorId,
        categories: {
          connect: [
            { id: book.catA },
            ...(book.catB ? [{ id: book.catB }] : []),
          ],
        },
      },
    });
  }

  await prisma.user.createMany({
    data: [
      { id: 'user-1', name: 'Alice Smith',  email: 'alice@example.com' },
      { id: 'user-2', name: 'Bob Jones',    email: 'bob@example.com' },
      { id: 'user-3', name: 'Carol White',  email: 'carol@example.com' },
      { id: 'user-4', name: 'David Brown',  email: 'david@example.com' },
      { id: 'user-5', name: 'Eve Davis',    email: 'eve@example.com' },
    ],
  });

  await prisma.loan.createMany({
    data: [
      { id: 'loan-1',  userId: 'user-1', bookId: 'book-1',  loanedAt: new Date('2024-01-10'), returnedAt: new Date('2024-01-24') },
      { id: 'loan-2',  userId: 'user-2', bookId: 'book-3',  loanedAt: new Date('2024-02-01'), returnedAt: null },
      { id: 'loan-3',  userId: 'user-3', bookId: 'book-5',  loanedAt: new Date('2024-02-15'), returnedAt: new Date('2024-03-01') },
      { id: 'loan-4',  userId: 'user-1', bookId: 'book-7',  loanedAt: new Date('2024-03-10'), returnedAt: null },
      { id: 'loan-5',  userId: 'user-4', bookId: 'book-10', loanedAt: new Date('2024-03-20'), returnedAt: new Date('2024-04-05') },
      { id: 'loan-6',  userId: 'user-5', bookId: 'book-12', loanedAt: new Date('2024-04-01'), returnedAt: null },
      { id: 'loan-7',  userId: 'user-2', bookId: 'book-15', loanedAt: new Date('2024-04-15'), returnedAt: new Date('2024-04-29') },
      { id: 'loan-8',  userId: 'user-3', bookId: 'book-18', loanedAt: new Date('2024-05-01'), returnedAt: null },
      { id: 'loan-9',  userId: 'user-4', bookId: 'book-20', loanedAt: new Date('2024-05-10'), returnedAt: new Date('2024-05-24') },
      { id: 'loan-10', userId: 'user-5', bookId: 'book-25', loanedAt: new Date('2024-06-01'), returnedAt: null },
    ],
  });
};
