/** Deterministic seed — truncates all tables then inserts fixed test data. */

export const seed = async (prisma: any) => {
  // Clear in dependency order (children before parents)
  await prisma.bookTag.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.book.deleteMany({});
  await prisma.author.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.shelf.deleteMany({});

  const a1 = await prisma.author.create({ data: { name: 'Herbert' } });
  const a2 = await prisma.author.create({ data: { name: 'Austen' } });
  const a3 = await prisma.author.create({ data: { name: 'Joyce' } });

  const c1 = await prisma.category.create({ data: { name: 'Sci-Fi', slug: 'sci-fi' } });
  const c2 = await prisma.category.create({ data: { name: 'Classic', slug: 'classic' } });
  const c3 = await prisma.category.create({ data: { name: 'Modern', slug: 'modern' } });

  const t1 = await prisma.tag.create({ data: { label: 'tag1' } });
  const t2 = await prisma.tag.create({ data: { label: 'tag2' } });
  const t3 = await prisma.tag.create({ data: { label: 'tag3' } });

  const b1 = await prisma.book.create({
    data: {
      title: 'Dune',
      authorId: a1.id,
      isbn: '978-0-441-01384-0',
      status: 'published',
      categories: { connect: [{ id: c1.id }, { id: c2.id }] },
      bookTags: { create: [{ tagId: t1.id }, { tagId: t2.id }, { tagId: t3.id }] },
      loans: { create: [{}, {}] },
      reviews: { create: [{ rating: 5 }] },
    },
  });

  const b2 = await prisma.book.create({
    data: {
      title: 'Emma',
      authorId: a2.id,
      isbn: '978-0-141-43956-0',
      status: 'published',
      bookTags: { create: [{ tagId: t1.id }] },
    },
  });

  const b3 = await prisma.book.create({
    data: {
      title: 'Ulysses',
      authorId: a1.id,
      isbn: null,
      status: 'draft',
      categories: { connect: [{ id: c2.id }] },
      loans: { create: [{}, {}, {}, {}, {}] },
      reviews: { create: [{ rating: 4 }, { rating: 3 }] },
    },
  });

  // Extra books for pagination (25+ total)
  const extraAuthors = [a1.id, a2.id, a3.id];
  for (let i = 4; i <= 28; i++) {
    await prisma.book.create({
      data: {
        title: `Book ${i}`,
        authorId: extraAuthors[(i - 4) % 3],
        status: 'draft',
      },
    });
  }

  await prisma.shelf.createMany({
    data: [
      { code: 'MAIN', name: 'Main Hall' },
      { code: 'ARCH', name: 'Archive' },
    ],
  });

  return { a1, a2, a3, c1, c2, c3, t1, t2, t3, b1, b2, b3 };
};
