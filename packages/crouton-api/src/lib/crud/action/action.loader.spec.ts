import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  JsonAction,
  ResourceRowProcedureAction,
  ResourceTableProcedureAction,
} from '@ghentcdh/crouton-core';
import {
  CURRENT_RESOURCE_VERSION,
  getRowActions,
  getRowProcedureActions,
  getTableActions,
  getTableProcedureActions,
  resolveTableNode,
} from '@ghentcdh/crouton-core';

import { loadActions } from './action.loader';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { invalid } from '../test-utils';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROW_PROCEDURE_TS = `export default async (
  prisma: unknown,
  recordId: string | number
) => 'published ' + String(recordId);`;

const TABLE_PROCEDURE_TS = `export default async (
  prisma: unknown
) => 'exported all';`;

describe('loadActions', () => {
  let tempDir: string;

  const writeAction = (name: string, code: string) => {
    mkdirSync(join(tempDir, 'actions'), { recursive: true });
    writeFileSync(join(tempDir, 'actions', name), code);
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-actions-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves the row procedure module onto the action object in place', async () => {
    writeAction('publish.ts', ROW_PROCEDURE_TS);
    const rowActions: JsonAction[] = [
      invalid<JsonAction>({
        type: 'procedure',
        id: 'publish',
        label: 'Publish',
        procedure: 'publish',
      }),
    ];

    const resolved = await loadActions(rowActions, tempDir, 'row');
    const publish = invalid<ResourceRowProcedureAction>(resolved[0]);

    expect(typeof publish.procedure).toBe('function');
    expect(await publish.procedure(undefined, '42')).toBe('published 42');
    // In place: the mutated object is the one the loader was handed (the
    // layout node's action), not a copy.
    expect(resolved[0]).toBe(rowActions[0]);
  });

  it('resolves the table procedure module with the table signature', async () => {
    writeAction('exportAll.ts', TABLE_PROCEDURE_TS);
    const tableActions: JsonAction[] = [
      invalid<JsonAction>({
        type: 'procedure',
        id: 'exportAll',
        label: 'Export all',
        procedure: 'exportAll',
      }),
    ];

    const resolved = await loadActions(tableActions, tempDir, 'table');
    const exportAll = invalid<ResourceTableProcedureAction>(resolved[0]);

    expect(typeof exportAll.procedure).toBe('function');
    expect(await exportAll.procedure(undefined)).toBe('exported all');
  });

  it('passes link actions through untouched', async () => {
    const link = {
      type: 'link',
      id: 'doi',
      label: 'DOI',
      href: 'https://doi.org/{id}',
    };
    const rowActions: JsonAction[] = [invalid<JsonAction>(link)];

    const resolved = await loadActions(rowActions, tempDir, 'row');

    expect(resolved[0]).toBe(link);
    expect(resolved[0]).not.toHaveProperty('procedure');
  });

  it('skips a procedure whose module cannot be found and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tableActions: JsonAction[] = [
      invalid<JsonAction>({
        type: 'procedure',
        id: 'ghost',
        label: 'Ghost',
        procedure: 'ghost',
      }),
    ];

    const resolved = await loadActions(tableActions, tempDir, 'table');

    expect(resolved).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[tableActions\] Procedure file not found for "ghost"/,
      ),
    );
    warn.mockRestore();
  });
});

describe('resource loading — layout actions resolved in place', () => {
  let tempDir: string;
  let resourceDir: string;

  const writeResource = () => {
    resourceDir = join(tempDir, 'books');
    mkdirSync(resourceDir, { recursive: true });
    writeFileSync(
      join(resourceDir, 'resource.json'),
      JSON.stringify(
        {
          name: 'book',
          route: 'books',
          source: { model: 'Book' },
          tag: 'Books',
          operations: {},
          schemaVersion: CURRENT_RESOURCE_VERSION,
          columns: {
            id: { idField: true },
            title: { type: 'string' },
          },
          layout: {
            table: {
              items: ['title'],
              rowActions: [
                {
                  type: 'procedure',
                  id: 'publish',
                  label: 'Publish',
                  procedure: 'publish',
                },
              ],
              tableActions: [
                {
                  type: 'procedure',
                  id: 'exportAll',
                  label: 'Export all',
                  procedure: 'exportAll',
                },
              ],
            },
          },
        },
        null,
        2,
      ),
    );
    mkdirSync(join(resourceDir, 'actions'), { recursive: true });
    writeFileSync(join(resourceDir, 'actions', 'publish.ts'), ROW_PROCEDURE_TS);
    writeFileSync(
      join(resourceDir, 'actions', 'exportAll.ts'),
      TABLE_PROCEDURE_TS,
    );
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-resource-actions-test-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('exposes the layout actions with loaded procedures through the accessors', async () => {
    writeResource();

    const [config] = await loadResourceConfigsFromDir(tempDir);
    expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
    expect(config).toBeDefined();

    // The layout node is the single source of truth — same array end to end.
    const layoutRowActions: unknown = resolveTableNode(
      config.layout?.table,
    )?.rowActions;
    expect(getRowActions(config)).toBe(layoutRowActions);
    const layoutTableActions: unknown = resolveTableNode(
      config.layout?.table,
    )?.tableActions;
    expect(getTableActions(config)).toBe(layoutTableActions);

    const rowActions = getRowProcedureActions(config);
    expect(rowActions.map((a) => a.id)).toEqual(['publish']);
    const publish = invalid<ResourceRowProcedureAction>(rowActions[0]);
    expect(await publish.procedure(undefined, '7')).toBe('published 7');

    const tableActions = getTableProcedureActions(config);
    expect(tableActions.map((a) => a.id)).toEqual(['exportAll']);
    const exportAll = invalid<ResourceTableProcedureAction>(tableActions[0]);
    expect(await exportAll.procedure(undefined)).toBe('exported all');
  });
});
