import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(_dirname, '../../..');

const globalSetup = async () => {
  execSync('pnpm nx run book-collection-backend:db:e2e-setup', {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
};

export default globalSetup;
