import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


const calls: string[][] = [];
let validateExitCode = 0;

vi.mock('node:child_process', () => ({
  spawn: (_cmd: string, args: string[]) => {
    calls.push(args);
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const code = args.includes('validate') ? validateExitCode : 0;
    setImmediate(() => child.emit('close', code));
    return child;
  },
}));

const { pullAndGenerate } = await import('./prisma-shell');

const GOOD = 'model A { id Int @id }\n';
const BROKEN = 'model A { id Int @id\n  x String\n  x Int }\n';

const setup = (current: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'crouton-shell-'));
  const schemaPath = join(dir, 'schema.prisma');
  writeFileSync(schemaPath, current);
  writeFileSync(`${schemaPath}.bak`, GOOD);
  process.env['DATABASE_URL'] ??= 'postgres://test';
  return { root: dir, schemaPath, prismaConfigPath: join(dir, 'prisma.config.ts') };
};

const pullArgs = () => calls.find((a) => a.includes('pull'));

describe('pullAndGenerate', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('valid schema: backs up current schema and pulls without --force', async () => {
    validateExitCode = 0;
    const input = setup('model B { id Int @id }\n');

    const result = await pullAndGenerate(input);

    expect(result.ok).toBe(true);
    expect(result.recoveredInvalidSchema).toBe(false);
    expect(readFileSync(`${input.schemaPath}.bak`, 'utf-8')).toBe('model B { id Int @id }\n');
    expect(pullArgs()).not.toContain('--force');
  });

  it('invalid schema (#541): keeps last good .bak and pulls with --force', async () => {
    validateExitCode = 1;
    const input = setup(BROKEN);

    const result = await pullAndGenerate(input);

    expect(result.ok).toBe(true);
    expect(result.recoveredInvalidSchema).toBe(true);
    expect(result.backupPath).toBe(`${input.schemaPath}.bak`);
    expect(readFileSync(`${input.schemaPath}.bak`, 'utf-8')).toBe(GOOD);
    expect(pullArgs()).toContain('--force');
  });
});
