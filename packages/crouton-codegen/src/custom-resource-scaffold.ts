/**
 * Scaffold a `kind: "custom"` resource — a resource whose form/table/view are
 * configured declaratively while the developer implements data access.
 *
 * Pure: returns the file set, writes nothing. The CLI runner does the I/O and
 * never overwrites an existing file.
 */

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

import { labelFromId } from './naming';
import { serializeResourceJson, withResourceHeader } from './serialize';
import type { FileWrite } from './write-plan';

export interface CustomResourceScaffoldInput {
  /** Resource directory + `name` (the frontend form id). */
  name: string;
  /** URL segment. Defaults to `name`. */
  route?: string;
  /** OpenAPI tag. Defaults to a label built from `name`. */
  tag?: string;
  /** UI title. Defaults to a label built from `name`. */
  title?: string;
  /** Named datasource to expose as `ctx.prisma`. Omitted ⇒ project default. */
  database?: string;
  /** Primary key type. Defaults to `'string'`. */
  idType?: 'string' | 'number';
  /** Where resources live, from `crouton.json`. */
  resourcesDir: string;
}

export interface CustomResourceScaffold {
  files: FileWrite[];
  notes: string[];
}

const buildResourceJson = (
  input: CustomResourceScaffoldInput,
): ResourceJsonInput => {
  const label = labelFromId(input.name);
  return {
    kind: 'custom',
    name: input.name,
    route: input.route ?? input.name,
    tag: input.tag ?? label,
    title: input.title ?? label,
    ...(input.database ? { database: input.database } : {}),
    ...(input.idType && input.idType !== 'string'
      ? { idType: input.idType }
      : {}),
    operations: {
      findAll: true,
      findOne: true,
      create: true,
      update: true,
      patch: true,
      delete: true,
    },
    columns: {
      id: {
        type: input.idType === 'number' ? 'integer' : 'string',
        idField: true,
        hiddenInForm: true,
        hiddenInTable: true,
      },
      name: {
        type: 'string',
        searchable: true,
        sortable: true,
        defaultSort: true,
        filterable: true,
      },
    },
  } as ResourceJsonInput;
};

const REPOSITORY_TS = `import type { CustomRepository } from '@ghentcdh/crouton-api';

/**
 * Data access for this resource.
 *
 * Every function is optional — an operation you do not implement must be
 * disabled in resource.json, otherwise the resource fails to load with a
 * message on the status page.
 *
 * \`ctx\` carries:
 *   - \`prisma\`       the resolved datasource client (undefined if none)
 *   - \`dataSources\`  resolve another datasource by name
 *   - \`config\`       the resolved resource config
 *   - \`op\`           which operation is running
 *   - \`offset\`       zero-based row offset derived from page/pageSize
 *   - \`id\`           record id, on the operations that address one
 */
const repository: CustomRepository = {
  /**
   * Return rows AND the total count — the framework builds the
   * { data, request: { count, totalPages, ... } } envelope from it.
   *
   * \`params.filter\` holds raw "field:value:operator" strings; import
   * \`parseFilterString\` from '@ghentcdh/crouton-api' to reuse the grammar.
   */
  findAll: async (params, ctx) => {
    throw new Error('TODO: implement findAll');
  },

  findOne: async (id, ctx) => {
    // Return null/undefined to produce a 404.
    throw new Error('TODO: implement findOne');
  },

  create: async (data, ctx) => {
    throw new Error('TODO: implement create');
  },

  update: async (id, data, ctx) => {
    throw new Error('TODO: implement update');
  },

  // Omit \`patch\` to reuse \`update\` for PATCH requests.

  delete: async (id, ctx) => {
    throw new Error('TODO: implement delete');
  },
};

export default repository;
`;

export const buildCustomResourceFiles = (
  input: CustomResourceScaffoldInput,
): CustomResourceScaffold => {
  const dir = `${input.resourcesDir}/${input.name}`;
  const config = buildResourceJson(input);

  return {
    files: [
      {
        path: `${dir}/resource.json`,
        contents: serializeResourceJson(withResourceHeader(config)),
        action: 'create',
      },
      {
        path: `${dir}/repository.ts`,
        contents: REPOSITORY_TS,
        action: 'create',
      },
    ],
    notes: [
      `Implement the operations in ${dir}/repository.ts.`,
      `Describe your data in ${dir}/resource.json — every column needs a "type" (a shorthand like "string", or a JSON Schema fragment for nested objects).`,
      `Disable any operation you do not implement: "operations": { "delete": false }.`,
      `Custom resources are not touched by \`crouton update resources\`.`,
    ],
  };
};
