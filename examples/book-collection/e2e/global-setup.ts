import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(_dirname, '../apps/backend');
const env = { ...process.env, DATABASE_URL: 'file:./prisma/dev.db', PORT: '3001' };

const globalSetup = async () => {
  execSync('pnpm exec prisma migrate reset --force', { cwd: backendDir, stdio: 'inherit', env });
  execSync('pnpm exec tsx prisma/seed.ts', { cwd: backendDir, stdio: 'inherit', env });
};

export default globalSetup;
