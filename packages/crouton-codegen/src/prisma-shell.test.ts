import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fixPrismaClientImport, normalizeSchema, pullAndGenerate, resolveFieldCollisions } from './prisma-shell';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';



const calls: string[][] = [];
let validateExitCode = 0;
let pullExitCode = 0;

vi.mock('node:child_process', () => ({
  spawn: (_cmd: string, args: string[]) => {
    calls.push(args);
    const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    const code = args.includes('validate') ? validateExitCode : args.includes('pull') ? pullExitCode : 0;
    setImmediate(() => child.emit('close', code));
    return child;
  },
}));


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
    pullExitCode = 0;
  });

  it('failed pull (#676): removes the backup it just made', async () => {
    validateExitCode = 0;
    pullExitCode = 1;
    const input = setup(GOOD);
    rmSync(`${input.schemaPath}.bak`);

    const result = await pullAndGenerate(input);

    expect(result.ok).toBe(false);
    expect(existsSync(`${input.schemaPath}.bak`)).toBe(false);
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

describe('resolveFieldCollisions (#539)', () => {
  const SCHEMA = `model Text {
  id             Int             @id @default(autoincrement())
  revisionStatus String?         @map("revision_status") @db.VarChar
  revisionStatusId Int?          @map("revision_status_id")
  revisionStatus RevisionStatus? @relation(fields: [revisionStatusId], references: [id])
  textSelection  TextSelection[]

  @@map("text")
}

model TextSelection {
  id     Int    @id
  text   String
  textId Int    @map("text_id")
  text   Text   @relation(fields: [textId], references: [id])
}

model RevisionStatus {
  id   Int     @id
  name String?
  text Text[]
}
`;

  it('renames the relation field, never the scalar', () => {
    const { schema, renames } = resolveFieldCollisions(SCHEMA);

    expect(renames).toEqual([
      { model: 'Text', from: 'revisionStatus', to: 'revisionStatusRef' },
      { model: 'TextSelection', from: 'text', to: 'textRef' },
    ]);
    expect(schema).toContain('revisionStatus String?         @map("revision_status")');
    expect(schema).toContain('revisionStatusRef RevisionStatus? @relation(fields: [revisionStatusId]');
    expect(schema).toContain('  text   String\n');
    expect(schema).toContain('textRef   Text   @relation(fields: [textId]');
  });

  it('leaves schemas without collisions untouched', () => {
    const clean = 'model A {\n  id Int @id\n  b  B   @relation(fields: [bId], references: [id])\n  bId Int\n}\n\nmodel B {\n  id Int @id\n  a  A[]\n}\n';
    expect(resolveFieldCollisions(clean)).toEqual({ schema: clean, renames: [] });
  });

  it('picks a free suffix when <name>Ref is already taken', () => {
    const s = 'model A {\n  b    String\n  bRef Int\n  b    B @relation(fields: [bRef], references: [id])\n}\n\nmodel B {\n  id Int @id\n  a  A[]\n}\n';
    expect(resolveFieldCollisions(s).renames).toEqual([{ model: 'A', from: 'b', to: 'bRef2' }]);
  });
});

describe('normalizeSchema renames (#540)', () => {
  const SCHEMA = `model Text {
  id               Int             @id
  revisionStatus   String?
  revisionStatusId Int?
  revisionStatus   RevisionStatus? @relation(fields: [revisionStatusId], references: [id])
}

model RevisionStatus {
  id   Int    @id
  text Text[]
}
`;

  const normalize = async (renames: unknown) => {
    const dir = mkdtempSync(join(tmpdir(), 'crouton-normalize-'));
    const schemaPath = join(dir, 'schema.prisma');
    writeFileSync(schemaPath, SCHEMA);
    writeFileSync(join(dir, 'normalize-schema.json'), JSON.stringify({ renames }));
    const result = await normalizeSchema(schemaPath);
    return { ...result, schema: readFileSync(schemaPath, 'utf-8') };
  };

  it('object form with relationOnly renames only the relation field', async () => {
    const { renamed, schema } = await normalize({
      Text: { revisionStatus: { to: 'revisionStatusRel', relationOnly: true } },
    });

    expect(renamed).toBe(1);
    expect(schema).toContain('  revisionStatus   String?\n');
    expect(schema).toContain('  revisionStatusRel   RevisionStatus? @relation(fields: [revisionStatusId]');
  });

  it('string form keeps renaming every line with that name', async () => {
    const { renamed, schema } = await normalize({ Text: { revisionStatus: 'status' } });

    expect(renamed).toBe(1);
    expect(schema).toContain('  status   String?\n');
    expect(schema).toContain('  status   RevisionStatus?');
    expect(schema).toContain('  revisionStatusId Int?');
  });

  it('object form without relationOnly behaves like the string form', async () => {
    const { schema } = await normalize({ Text: { revisionStatus: { to: 'status' } } });
    expect(schema).not.toMatch(/^\s+revisionStatus\s/m);
  });
});

describe('fixPrismaClientImport (#597)', () => {
  it('rewrites bare @prisma/client imports to the generated client, relative per file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'crouton-client-'));
    const types = join(root, 'generated/default/types/src');
    mkdirSync(join(types, 'modelSchema'), { recursive: true });
    writeFileSync(join(types, 'modelSchema/OrderSchema.ts'), 'import { Prisma } from \'@prisma/client\'\n');
    writeFileSync(join(types, 'index.ts'), 'import type { Prisma } from "@prisma/client";\n');
    writeFileSync(join(types, 'other.ts'), 'import { z } from \'zod\';\n');

    const fixed = await fixPrismaClientImport(types, join(root, 'generated/default/client/index'));

    expect(fixed).toBe(2);
    expect(readFileSync(join(types, 'modelSchema/OrderSchema.ts'), 'utf-8')).toBe(
      'import { Prisma } from \'../../../client/index\'\n',
    );
    expect(readFileSync(join(types, 'index.ts'), 'utf-8')).toBe(
      'import type { Prisma } from \'../../client/index\';\n',
    );
    expect(readFileSync(join(types, 'other.ts'), 'utf-8')).toBe('import { z } from \'zod\';\n');
  });
});
