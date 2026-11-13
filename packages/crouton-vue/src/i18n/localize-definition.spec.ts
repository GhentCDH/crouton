import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { localizeDefinition } from './localize-definition';

// useLanguage is a Vue-side singleton; stub the translator with a fixed bundle.
const bundle: Record<string, string> = {};

vi.mock('./useLanguage', () => ({
  useLanguage: () => ({
    translator: (key: string, fallback?: string): string =>
      bundle[key] ?? fallback ?? key,
  }),
}));

interface DefExtras {
  table?: Record<string, unknown>;
  form?: Record<string, unknown>;
  view?: unknown;
}

const def = (
  id: string,
  name: string,
  extras: DefExtras = {},
): ResourceDefinition =>
  ({
    id,
    name,
    title: name,
    schemas: {
      table: {
        data: {
          properties: {
            amount: { type: 'number', title: 'Amount' },
            // 'note' is deliberately left out of the default bundle so tests can
            // assert the "no candidate key resolves" fallback.
            note: { type: 'string', title: 'Note' },
          },
        },
        ui: {
          elements: [
            { scope: '#/properties/amount', options: { label: 'Amount' } },
            { scope: '#/properties/note', options: { label: 'Note' } },
          ],
        },
        columns: [
          { id: 'amount', label: 'Amount' },
          { id: 'note', label: 'Note' },
        ],
        ...extras.table,
      },
      form: {
        data: { properties: { amount: { type: 'number', title: 'Amount' } } },
        ui: { elements: [{ scope: '#/properties/amount', options: { label: 'Amount' } }] },
        ...extras.form,
      },
      view: extras.view,
    },
  }) as unknown as ResourceDefinition;

const tableColumns = (d: ResourceDefinition): Array<{ id: string; label?: string }> =>
  d.schemas.table.columns as unknown as Array<{ id: string; label?: string }>;

const tableActions = (d: ResourceDefinition): {
  rowActions: Array<Record<string, unknown>>;
  tableActions: Array<Record<string, unknown>>;
} => d.schemas.table as unknown as {
  rowActions: Array<Record<string, unknown>>;
  tableActions: Array<Record<string, unknown>>;
};

const bundleDefaults = {
  'resources.books.title': 'Boeken',
  'resources.books.columns.amount': 'Titel',
  'resources.groups.subResources.entries.title': 'Boekingen',
  'resources.groups.subResources.entries.columns.amount': 'Bedrag',
};

describe('localizeDefinition', () => {
  beforeEach(() => {
    for (const key of Object.keys(bundle)) delete bundle[key];
    Object.assign(bundle, bundleDefaults);
  });

  it('translates a top-level resource via flat keys', () => {
    const out = localizeDefinition(def('books', 'books'));
    expect(out.title).toBe('Boeken');
    expect(tableColumns(out)[0].label).toBe('Titel');
  });

  it('translates a sub-resource via parent-scoped keys', () => {
    const out = localizeDefinition(def('groups/entries', 'entries'));
    expect(out.title).toBe('Boekingen');
    expect(tableColumns(out)[0].label).toBe('Bedrag');
    expect(
      (out.schemas.form.ui as { elements: Array<{ options: { label: string } }> }).elements[0]
        .options.label,
    ).toBe('Bedrag');
    expect(
      (out.schemas.form.data as { properties: { amount: { title: string } } }).properties.amount
        .title,
    ).toBe('Bedrag');
  });

  it('falls back to the name-keyed sub-resource variant when the route key is absent', () => {
    delete bundle['resources.groups.subResources.entries.title'];
    delete bundle['resources.groups.subResources.entries.columns.amount'];
    Object.assign(bundle, {
      'resources.groups.subResources.expense.title': 'Onkosten',
      'resources.groups.subResources.expense.columns.amount': 'Bedrag (naam)',
    });

    // def.name ('expense') differs from the child route in the id ('entries').
    const out = localizeDefinition(def('groups/entries', 'expense'));
    expect(out.title).toBe('Onkosten');
    expect(tableColumns(out)[0].label).toBe('Bedrag (naam)');
  });

  it('keeps the original labels when no candidate key resolves', () => {
    const out = localizeDefinition(def('groups/entries', 'entries'));

    // 'note' has no entry under any candidate key (route, name or flat).
    expect(tableColumns(out)[1].label).toBe('Note');
    const ui = out.schemas.table.ui as {
      elements: Array<{ scope: string; options: { label: string } }>;
    };
    const noteElement = ui.elements.find((el) => el.scope.endsWith('/note'));
    expect(noteElement?.options.label).toBe('Note');
  });

  it('falls back to flat keys when the bundle stores sub-resources flat', () => {
    delete bundle['resources.groups.subResources.entries.columns.amount'];
    Object.assign(bundle, { 'resources.entries.columns.amount': 'Bedrag (flat)' });
    const out = localizeDefinition(def('groups/entries', 'entries'));
    expect(tableColumns(out)[0].label).toBe('Bedrag (flat)');
  });

  it('translates top-level row and table actions via action keys', () => {
    Object.assign(bundle, {
      'resources.books.actions.edit': 'Bewerk',
      'resources.books.actions.create': 'Nieuw',
    });
    const out = localizeDefinition(
      def('books', 'books', {
        table: {
          rowActions: [{ id: 'edit', label: 'Edit' }],
          // An action without a label must stay label-less.
          tableActions: [{ id: 'create', label: 'Create' }, { id: 'export' }],
        },
      }),
    );

    const { rowActions, tableActions: outTableActions } = tableActions(out);
    expect(rowActions[0].label).toBe('Bewerk');
    expect(outTableActions[0].label).toBe('Nieuw');
    expect('label' in outTableActions[1]).toBe(false);
  });

  it('translates sub-resource actions via parent-scoped action keys', () => {
    Object.assign(bundle, {
      'resources.groups.subResources.entries.actions.delete': 'Verwijder',
    });
    const out = localizeDefinition(
      def('groups/entries', 'entries', {
        table: { rowActions: [{ id: 'delete', label: 'Delete' }] },
      }),
    );

    expect(tableActions(out).rowActions[0].label).toBe('Verwijder');
  });

  it('uses an explicit column labelKey instead of the derived candidates', () => {
    Object.assign(bundle, { 'books.custom.amount': 'Aangepast' });
    const out = localizeDefinition(
      def('books', 'books', {
        table: { columns: [{ id: 'amount', label: 'Amount', labelKey: 'books.custom.amount' }] },
      }),
    );

    expect(tableColumns(out)[0].label).toBe('Aangepast');
  });
});
