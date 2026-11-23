import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createProgram } from './program';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = async (args: string[]) => {
  process.exitCode = undefined;
  await createProgram().parseAsync(['node', 'crouton', ...args]);
  const code = process.exitCode;
  process.exitCode = undefined;
  return code;
};

const write = (root: string, files: Record<string, string>) => {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
};

describe('crouton create project', () => {
  let root: string;
  const read = (p: string) => readFileSync(join(root, p), 'utf-8');
  const json = <T>(p: string) => JSON.parse(read(p)) as T;
  type Pkg = { name: string; resourcesDir: string; generatedTypesImport: string };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'crouton-create-project-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  describe('Nx codespace', () => {
    beforeEach(() =>
      write(root, {
        'nx.json': '{}',
        'package.json': JSON.stringify({ name: '@ws/workspace' }),
        'pnpm-workspace.yaml': 'packages:\n  - apps/*\n  - generated/**\n  - libs/*\n',
        'tsconfig.base.json': JSON.stringify({ compilerOptions: { paths: { '@ws/generated-default-types': ['./generated/default/types/src'] } } }),
        'compose.yml': 'include:\n  - compose.app.ws.yml\n',
        'compose.app.ws.yml': '      - "${BACKEND_PORT:-3000}:${BACKEND_PORT:-3000}"\n',
        '.env': 'BACKEND_PORT=3000\nFRONTEND_PORT=4200\n',
        // a second project already took 3001 / 4201
        'other/.env': 'BACKEND_PORT=3001\nFRONTEND_PORT=4201\n',
      }),
    );

    it('--dry-run writes nothing', async () => {
      expect(await run(['create', 'project', 'archive', '--cwd', root, '--dry-run', '-y'])).toBeFalsy();
      expect(existsSync(join(root, 'archive'))).toBe(false);
      expect(read('compose.yml')).toBe('include:\n  - compose.app.ws.yml\n');
    });

    it('adds a workspace under <name>/ and registers it at the root', async () => {
      expect(await run(['create', 'project', 'archive', '--cwd', root, '-y'])).toBeFalsy();

      expect(json<Pkg>('archive/crouton.json').resourcesDir).toBe('apps/backend/src/app/resources');
      expect(json<Pkg>('archive/apps/backend/package.json').name).toBe('@archive/backend');
      expect(existsSync(join(root, 'archive/apps/frontend/package.json'))).toBe(true);
      expect(json<Pkg>('archive/apps/backend/src/app/data-sources/default/data-source.json').generatedTypesImport)
        .toBe('@archive/generated-default-types');

      // free ports, picked past every port already in use
      expect(read('archive/.env')).toContain('BACKEND_PORT=3002');
      expect(read('archive/.env')).toContain('FRONTEND_PORT=4202');

      // docker: per-project compose file on the codespace network, Dockerfiles next to crouton.json
      const compose = read('compose.app.archive.yml');
      expect(compose).toContain('name: ws-net');
      expect(compose).toContain('NX_COMMAND=archive-backend:serve');
      expect(existsSync(join(root, 'archive/Dockerfile.dev'))).toBe(true);
      expect(existsSync(join(root, '.dockerignore'))).toBe(false);

      // root registration
      expect(read('pnpm-workspace.yaml')).toBe(
        'packages:\n  - archive/apps/*\n  - archive/generated/**\n  - \'!archive/generated/*/client\'\n  - apps/*\n  - generated/**\n  - libs/*\n',
      );
      const paths = json<{ compilerOptions: { paths: Record<string, string[]> } }>('tsconfig.base.json').compilerOptions.paths;
      expect(paths['@ws/generated-default-types']).toEqual(['./generated/default/types/src']);
      expect(paths['@archive/generated-default-types']).toEqual(['./archive/generated/default/types/src']);
      expect(paths['@archive/generated-default-client']).toEqual(['./archive/generated/default/client']);
      expect(read('compose.yml')).toBe('include:\n  - compose.app.ws.yml\n  - compose.app.archive.yml\n');
    });

    it('keeps the generated Prisma client out of the pnpm workspace (#543)', async () => {
      expect(await run(['create', 'project', 'archive', '--cwd', root, '-y'])).toBeFalsy();

      // Prisma rewrites the client's package.json on every generate, so no app
      // may depend on it as a workspace package — it is imported via tsconfig paths.
      const backend = json<{ dependencies: Record<string, string> }>('archive/apps/backend/package.json');
      expect(backend.dependencies['@archive/generated-default-client']).toBeUndefined();
      expect(backend.dependencies['@prisma/client-runtime-utils']).toBe(backend.dependencies['@prisma/client']);
      expect(backend.dependencies['@archive/generated-default-types']).toBe('workspace:*');
    });

    it('custom folder layout: crouton.json in the apps dir, generated code elsewhere (#666)', async () => {
      write(root, { '.gitignore': 'node_modules\n**/generated/*/client/\n' });
      expect(await run([
        'create', 'project', 'ms-service', '--cwd', root, '-y',
        '--apps-dir', 'apps/ms-service', '--backend-dir', 'crouton-backend', '--frontend-dir', 'crouton-frontend',
        '--generated-dir', 'generated/ms-service',
      ])).toBeFalsy();

      const svc = 'apps/ms-service';
      const config = json<{ resourcesDir: string; dataSourcesDir: string }>(`${svc}/crouton.json`);
      expect(config.resourcesDir).toBe('crouton-backend/src/app/resources');
      expect(config.dataSourcesDir).toBe('crouton-backend/src/app/data-sources');
      expect(existsSync(join(root, `${svc}/crouton-frontend/package.json`))).toBe(true);
      expect(existsSync(join(root, 'generated/ms-service/default/types/package.json'))).toBe(true);
      expect(existsSync(join(root, `${svc}/apps`))).toBe(false);

      const ds = json<{ zodOutput: string; clientOutput: string }>(
        `${svc}/crouton-backend/src/app/data-sources/default/data-source.json`,
      );
      expect(ds.zodOutput).toBe('../../generated/ms-service/default/types/src');
      expect(ds.clientOutput).toBe('../../generated/ms-service/default/client');
      expect(read(`${svc}/prisma/default/schema.prisma`)).toContain('output   = "../../../../generated/ms-service/default/client"');

      // backend app: project name from the last segment, paths relative to its depth
      const project = json<{ name: string; $schema: string; sourceRoot: string; targets: { serve: { options: { envFile: string } } } }>(
        `${svc}/crouton-backend/project.json`,
      );
      expect(project.name).toBe('ms-service-backend');
      expect(project.$schema).toBe('../../../node_modules/nx/schemas/project-schema.json');
      expect(project.sourceRoot).toBe(`${svc}/crouton-backend/src`);
      expect(project.targets.serve.options.envFile).toBe(`${svc}/.env`);
      expect(read(`${svc}/crouton-backend/eslint.config.mjs`)).toContain('\'../../../eslint.config.mjs\'');
      expect(read(`${svc}/crouton-backend/nodemon.json`)).toContain('"../../../generated/ms-service"');
      expect(read(`${svc}/crouton-frontend/vite.config.ts`)).toContain('new URL(\'..\', import.meta.url)');
      expect(read(`${svc}/Dockerfile.prod`)).toContain(`COPY ${svc}/crouton-backend/src/app/resources`);

      // root registration
      expect(read('pnpm-workspace.yaml')).toContain(
        `  - ${svc}/*\n  - generated/ms-service/**\n  - '!generated/ms-service/*/client'\n`,
      );
      const paths = json<{ compilerOptions: { paths: Record<string, string[]> } }>('tsconfig.base.json').compilerOptions.paths;
      expect(paths['@ms-service/generated-default-types']).toEqual(['./generated/ms-service/default/types/src']);
      expect(read('.gitignore')).toContain('generated/ms-service/*/client/\n');
      expect(read('compose.yml')).toContain('  - compose.app.ms-service.yml\n');
    });

    it('--no-frontend skips the frontend app', async () => {
      expect(await run(['create', 'project', 'archive', '--cwd', root, '-y', '--no-frontend'])).toBeFalsy();
      expect(existsSync(join(root, 'archive/apps/frontend'))).toBe(false);
    });

    it('refuses a non-empty target and an invalid name', async () => {
      write(root, { 'archive/keep.txt': '' });
      expect(await run(['create', 'project', 'archive', '--cwd', root, '-y'])).toBe(1);
      expect(await run(['create', 'project', 'Bad_Name', '--cwd', root, '-y'])).toBe(1);
    });
  });

  it('regular codespace: standalone app in <name>/', async () => {
    write(root, { 'package.json': JSON.stringify({ name: 'books' }), 'crouton.json': '{}' });
    expect(await run(['create', 'project', 'archive', '--cwd', root, '-y'])).toBeFalsy();

    expect(json<Pkg>('archive/crouton.json').resourcesDir).toBe('src/resources');
    expect(json<Pkg>('archive/package.json').name).toBe('archive');
    expect(existsSync(join(root, 'archive/src/data-sources/default/data-source.json'))).toBe(true);
    expect(read('archive/.env')).toContain('BACKEND_PORT=3001');
    expect(read('archive/compose.app.archive.yml')).toContain('name: books-net');
    expect(read('package.json')).toBe(JSON.stringify({ name: 'books' }));
  });

  it('outside a codespace: error pointing at create-crouton', async () => {
    expect(await run(['create', 'project', 'archive', '--cwd', root, '-y'])).toBe(1);
  });
});
