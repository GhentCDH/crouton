import { PrismaClient } from '@mela/generated-default-client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const client = new PrismaClient({ adapter });

export default client;
