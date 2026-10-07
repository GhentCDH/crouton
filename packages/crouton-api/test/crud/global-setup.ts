import { PostgreSqlContainer } from '@testcontainers/postgresql';

import { execSync } from 'node:child_process';
import { join } from 'node:path';

let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;

export const setup = async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  const url = container.getConnectionUri();
  process.env['TEST_DATABASE_URL'] = url;

  const schemaPath = join(import.meta.dirname, '../prisma/schema.prisma');

  // Generate the Prisma client into test/prisma/generated, then push the schema.
  execSync(`pnpm prisma generate --schema="${schemaPath}"`, {
    env: { ...process.env, TEST_DATABASE_URL: url },
    stdio: 'inherit',
  });

  execSync(`pnpm prisma db push --schema="${schemaPath}" --skip-generate`, {
    env: { ...process.env, TEST_DATABASE_URL: url },
    stdio: 'inherit',
  });
};

export const teardown = async () => {
  await container?.stop();
};
