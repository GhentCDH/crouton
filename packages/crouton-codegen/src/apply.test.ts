import { describe, expect, it } from 'vitest';

import { apply } from './apply';
import { classify } from './classify';
import { diff } from './diff';
import { recommendedResolver, resolve } from './resolve';

import type { ResourceJsonInputInput } from '@ghentcdh/crouton-core';
import type { DbModel } from './db-model';

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

    const schema = plan.files.find((f) => f.path.endsWith('schema.ts'))!;
    // Language has no relations → plain LanguageSchema (no WithRelations export).
    expect(schema.contents).toBe(
      'import { LanguageSchema } from \'@np/generated/types\';\n\nexport default LanguageSchema;\n',
    );
    const res = JSON.parse(
      plan.files.find((f) => f.path.endsWith('resource.json'))!.contents,
    );
    expect(res.sidebar).toEqual({ hide: false }); // recommended = yes
    expect(res.model).toBe('language');
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
    const schema = plan.files.find((f) => f.path.endsWith('schema.ts'))!;
    expect(schema.contents).toContain('WorkWithRelationsSchema');
  });
});

describe('apply — idempotency', () => {
  it('re-running against its own output yields no decisions and writes no files', async () => {
    const first = await run();
    const resourceJson = first.files.find((f) =>
      f.path.endsWith('resource.json'),
    )!.contents;
    const existing = JSON.parse(resourceJson) as ResourceJsonInput;

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
    model: 'language',
    tag: 'Language',
    title: 'Language',
    idType: 'string',
    database: 'docsdb',
    sidebar: { hide: true },
    operations: {
      findAll: true,
      findOne: true,
      create: true,
      update: true,
      delete: true,
    },
    actions: [
      { type: 'link', id: 'preview', label: 'Preview', href: '/p/{id}' },
    ],
    columns: {
      id: {
        idField: true,
        hiddenInTable: true,
        hiddenInForm: true,
        hiddenInView: true,
      },
      name: { fieldInput: { type: 'markdown', position: 0 } }, // hand-edited
      legacy: { fieldInput: { type: 'text' } }, // not in DB
    },
  };

  it('adds missing DB columns, keeps edited + sidebar + actions, keeps unknown columns', async () => {
    const draft = classify(model, { database: 'docsdb' });
    const d = diff({ draft, existing, hasSchemaFile: true });
    const plan = apply(await resolve(d, recommendedResolver), ctx);
    const res = JSON.parse(
      plan.files.find((f) => f.path.endsWith('resource.json'))!.contents,
    );

    expect(res.columns.created_at).toBeDefined(); // added from DB
    expect(res.columns.name.fieldInput.type).toBe('markdown'); // kept (recommended=keep)
    expect(res.columns.legacy).toBeDefined(); // kept (recommended=keep)
    expect(res.sidebar).toEqual({ hide: true }); // preserved
    expect(res.actions).toHaveLength(1); // preserved
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
    const res = JSON.parse(
      plan.files.find((f) => f.path.endsWith('resource.json'))!.contents,
    );
    expect(res.columns.name.fieldInput.type).toBe('text'); // overwritten with generated default
    expect(res.columns.legacy).toBeUndefined(); // removed
    expect(res.columns.created_at).toBeDefined();
  });
});
