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
        'packages:\n  - archive/apps/*\n  - archive/generated/**\n  - apps/*\n  - generated/**\n  - libs/*\n',
      );
      const paths = json<{ compilerOptions: { paths: Record<string, string[]> } }>('tsconfig.base.json').compilerOptions.paths;
      expect(paths['@ws/generated-default-types']).toEqual(['./generated/default/types/src']);
      expect(paths['@archive/generated-default-types']).toEqual(['./archive/generated/default/types/src']);
      expect(paths['@archive/generated-default-client']).toEqual(['./archive/generated/default/client']);
      expect(read('compose.yml')).toBe('include:\n  - compose.app.ws.yml\n  - compose.app.archive.yml\n');
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
