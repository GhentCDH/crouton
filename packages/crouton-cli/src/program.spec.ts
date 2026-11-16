import type { Command } from 'commander';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createProgram } from './program';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const EXAMPLE = resolve(__dirname, '../../../examples/book-collection');

/** Every command path, e.g. ['create', 'resource']. */
const commandPaths = (cmd: Command, prefix: string[] = []): string[][] =>
  cmd.commands.flatMap((c) => [[...prefix, c.name()], ...commandPaths(c, [...prefix, c.name()])]);

const run = async (args: string[]) => {
  const program = createProgram();
  let out = '';
  const capture = (c: Command) => {
    c.exitOverride().configureOutput({ writeOut: (s) => (out += s), writeErr: (s) => (out += s) });
    c.commands.forEach(capture);
  };
  capture(program);
  process.exitCode = undefined;
  try {
    await program.parseAsync(['node', 'crouton', ...args]);
  } catch (err) {
    if ((err as { code?: string }).code !== 'commander.helpDisplayed') throw err;
  }
  const exitCode = process.exitCode;
  process.exitCode = undefined;
  return { out, exitCode };
};

const status = () => execFileSync('git', ['status', '--porcelain', '--', EXAMPLE], { encoding: 'utf8' });

describe('crouton CLI', () => {
  const paths = commandPaths(createProgram());

  it('registers the verb-noun surface', () => {
    expect(paths.map((p) => p.join(' '))).toEqual(
      expect.arrayContaining([
        'update', 'update resources', 'update translations',
        'create', 'create resource', 'create datasource',
        'init translations',
        'validate', 'validate resources',
        'migrate', 'migrate resources', 'migrate layout',
      ]),
    );
  });

  it.each(paths.map((p) => [p.join(' '), p]))('%s --help', async (_, path) => {
    const { out } = await run([...path, '--help']);
    expect(out).toContain(`Usage: crouton ${path.join(' ')}`);
  });

  // `update resources` is left out: book-collection's data-source.json is still v1 (no prismaSchema /
  // generatedTypesImport), so codegen refuses it before the dry run starts.
  describe('--dry-run in examples/book-collection writes nothing', () => {
    let before: string;
    beforeAll(() => {
      before = status();
    });
    afterEach(() => {
      expect(status()).toBe(before);
    });

    it.each([
      ['migrate resources'],
      ['migrate layout'],
      ['migrate'],
      ['update translations'],
      ['init translations'],
      ['create resource smoke_test'],
      ['create datasource --name smoke --adapter prisma --type postgresql'],
    ])('%s', async (cmd) => {
      const { exitCode } = await run([...cmd.split(' '), '--cwd', EXAMPLE, '--dry-run', '-y']);
      expect(exitCode).toBeFalsy();
    });

    it('validate resources', async () => {
      const { exitCode } = await run(['validate', 'resources', '--cwd', EXAMPLE]);
      expect(exitCode).toBeFalsy();
    });
  });
});
