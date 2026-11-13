import { describe, expect, it } from 'vitest';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

import { apply } from './apply';
import { classify } from './classify';
import type { DbModel } from './db-model';
import { diff } from './diff';
import { recommendedResolver, resolve } from './resolve';


const model: DbModel = {
  prismaName: 'Language',
  clientAccessor: 'language',
  tableName: 'language',
  idField: 'id',
  idType: 'string',
  hasCompositeId: false,
  fields: [
    {
      name: 'id',
      kind: 'id',
      type: 'String',
      isList: false,
      isRequired: true,
      isId: true,
      isUnique: false,
      isUpdatedAt: false,
      hasDefault: true,
      isTimestamp: false,
    },
    {
      name: 'name',
      kind: 'scalar',
      type: 'String',
      isList: false,
      isRequired: true,
      isId: false,
      isUnique: false,
      isUpdatedAt: false,
      hasDefault: false,
      isTimestamp: false,
    },
    {
      name: 'created_at',
      kind: 'scalar',
      type: 'DateTime',
      isList: false,
      isRequired: false,
      isId: false,
      isUnique: false,
      isUpdatedAt: false,
      hasDefault: true,
      isTimestamp: true,
    },
  ],
};

const ctx = {
  resourcesDir: 'apps/backend/src/app/resources',
  generatedTypesImport: '@np/generated/types',
};

const run = async (existing?: ResourceJsonInput, hasSchemaFile = false) => {
  const draft = classify(model, { database: 'docsdb' });
  const d = diff({ draft, existing, hasSchemaFile });
  const resolved = await resolve(d, recommendedResolver);
  return apply(resolved, ctx);
};

describe('apply — new resource', () => {
  it('writes resource.json + schema.ts and honors the sidebar choice', async () => {
    const plan = await run();
    const paths = plan.files.map((f) => f.path);
    expect(paths).toContain(
      'apps/backend/src/app/resources/language/resource.json',
    );
    expect(paths).toContain(
      'apps/backend/src/app/resources/language/schema.ts',
    );

    const schema = plan.files.find((f) => f.path.endsWith('schema.ts'));
    if (!schema) throw new Error('schema.ts not found');
    // Language has no relations → plain LanguageSchema (no WithRelations export).
    expect(schema.contents).toBe(
      'import { LanguageSchema } from \'@np/generated/types\';\n\nexport default LanguageSchema;\n',
    );
    const resFile = plan.files.find((f) => f.path.endsWith('resource.json'));
    if (!resFile) throw new Error('resource.json not found');
    const res = JSON.parse(resFile.contents) as { sidebar?: unknown; source?: { model?: string } };
    expect(res.sidebar).toEqual({ hide: false }); // recommended = yes
    expect(res.source?.model).toBe('language');
  });

  it('does not regenerate schema.ts when one already exists', async () => {
    const plan = await run(undefined, true);
    expect(plan.files.some((f) => f.path.endsWith('schema.ts'))).toBe(false);
  });

  it('uses the WithRelations export for a model that has relations', async () => {
    const withRel: DbModel = {
      ...model,
      prismaName: 'Work',
      clientAccessor: 'work',
      tableName: 'work',
      fields: [
        ...model.fields,
        {
          name: 'sections',
          kind: 'relation',
          type: 'Section',
          isList: true,
          isRequired: false,
          isId: false,
          isUnique: false,
          isUpdatedAt: false,
          hasDefault: false,
          isTimestamp: false,
          relationModel: 'Section',
        },
      ],
    };
    const d = diff({
      draft: classify(withRel, { database: 'docsdb' }),
      hasSchemaFile: false,
    });
    const plan = apply(await resolve(d, recommendedResolver), ctx);
    const schema = plan.files.find((f) => f.path.endsWith('schema.ts'));
    if (!schema) throw new Error('schema.ts not found');
    expect(schema.contents).toContain('WorkWithRelationsSchema');
  });
});

describe('apply — idempotency', () => {
  it('re-running against its own output yields no decisions and writes no files', async () => {
    const first = await run();
    const resourceJsonFile = first.files.find((f) => f.path.endsWith('resource.json'));
    if (!resourceJsonFile) throw new Error('resource.json not found');
    const existing = JSON.parse(resourceJsonFile.contents) as ResourceJsonInput;

    const draft = classify(model, { database: 'docsdb' });
    const d2 = diff({ draft, existing, hasSchemaFile: true });
    expect(d2.isNew).toBe(false);
    expect(d2.decisions).toEqual([]); // nothing to change

    const plan2 = apply(await resolve(d2, recommendedResolver), ctx);
    // No-op update + schema.ts already present → nothing to write.
    expect(plan2.files).toEqual([]);
  });
});

describe('apply — update merges and preserves hand edits', () => {
  const existing: ResourceJsonInput = {
    name: 'language',
    route: 'language',
    source: { model: 'language', idType: 'string', datasource: 'docsdb' },
    tag: 'Language',
    title: 'Language',
    sidebar: { hide: true },
    operations: {
      findAll: true,
      findOne: true,
      create: true,
      update: true,
      delete: true,
    },
    layout: {
      table: {
        actions: [
          { type: 'link', id: 'preview', label: 'Preview', href: '/p/{id}' },
        ],
      },
    },
    columns: {
      id: {
        idField: true,
        hiddenInTable: true,
        hiddenInForm: true,
        hiddenInView: true,
      },
      name: { fieldInput: { type: 'markdown' } }, // hand-edited
      legacy: { fieldInput: { type: 'text' } }, // not in DB
    },
  };

  it('adds missing DB columns, keeps edited + sidebar + actions, keeps unknown columns', async () => {
    const draft = classify(model, { database: 'docsdb' });
    const d = diff({ draft, existing, hasSchemaFile: true });
    const plan = apply(await resolve(d, recommendedResolver), ctx);
    const resFile1 = plan.files.find((f) => f.path.endsWith('resource.json'));
    if (!resFile1) throw new Error('resource.json not found');
    const res = JSON.parse(resFile1.contents) as {
      sidebar?: unknown;
      columns?: Record<string, { fieldInput?: { type?: string } } | undefined>;
      layout?: { table?: { actions?: unknown[] } };
    };

    expect(res.columns?.['created_at']).toBeDefined(); // added from DB
    expect(res.columns?.['name']?.fieldInput?.type).toBe('markdown'); // kept (recommended=keep)
    expect(res.columns?.['legacy']).toBeDefined(); // kept (recommended=keep)
    expect(res.sidebar).toEqual({ hide: true }); // preserved
    expect(res.layout?.table?.actions).toHaveLength(1); // preserved (moved to layout.table)
    expect(plan.files[0].action).toBe('update');
  });

  it('overwrite/remove choices take effect when resolved that way', async () => {
    const draft = classify(model, { database: 'docsdb' });
    const d = diff({ draft, existing, hasSchemaFile: true });
    const resolved = await resolve(d, {
      resolve: () => ({
        'reconcile:name': 'overwrite',
        'remove:legacy': 'remove',
        'add:created_at': 'add',
      }),
    });
    const plan = apply(resolved, ctx);
    const resFile2 = plan.files.find((f) => f.path.endsWith('resource.json'));
    if (!resFile2) throw new Error('resource.json not found');
    const res2 = JSON.parse(resFile2.contents) as {
      columns?: Record<string, { fieldInput?: { type?: string } } | undefined>;
    };
    expect(res2.columns?.['name']?.fieldInput?.type).toBe('string'); // overwritten with generated default
    expect(res2.columns?.['legacy']).toBeUndefined(); // removed
    expect(res2.columns?.['created_at']).toBeDefined();
  });
});
