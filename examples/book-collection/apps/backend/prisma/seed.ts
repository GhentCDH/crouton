import { PrismaClient } from '../src/app/generated/client/index.js';

const prisma = new PrismaClient();

const seed = async () => {
  await prisma.$transaction([
    prisma.loan.deleteMany(),
    prisma.book.deleteMany(),
    prisma.category.deleteMany(),
    prisma.author.deleteMany(),
    prisma.user.deleteMany(),
  ]);

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

  console.log('Seed complete.');
};

seed().catch(console.error).finally(() => prisma.$disconnect());
