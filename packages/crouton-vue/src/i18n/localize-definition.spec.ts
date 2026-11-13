import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { localizeDefinition } from './localize-definition';

// useLanguage is a Vue-side singleton; stub the translator with a fixed bundle.
const bundle: Record<string, string> = {
  'resources.books.title': 'Boeken',
  'resources.books.columns.title': 'Titel',
  'resources.groups.subResources.entries.title': 'Boekingen',
  'resources.groups.subResources.entries.columns.amount': 'Bedrag',
};

vi.mock('./useLanguage', () => ({
  useLanguage: () => ({
    translator: (key: string, fallback?: string): string =>
      bundle[key] ?? fallback ?? key,
  }),
}));

const def = (id: string, name: string): ResourceDefinition =>
  ({
    id,
    name,
    title: name,
    schemas: {
      table: {
        data: { properties: { amount: { type: 'number', title: 'Amount' } } },
        ui: { elements: [{ scope: '#/properties/amount', options: { label: 'Amount' } }] },
        columns: [{ id: 'amount', label: 'Amount' }],
      },
      form: {
        data: { properties: { amount: { type: 'number', title: 'Amount' } } },
        ui: { elements: [{ scope: '#/properties/amount', options: { label: 'Amount' } }] },
      },
      view: undefined,
    },
  }) as unknown as ResourceDefinition;

describe('localizeDefinition', () => {
  beforeEach(() => {
    for (const key of Object.keys(bundle)) delete bundle[key];
    Object.assign(bundle, {
      'resources.books.title': 'Boeken',
      'resources.books.columns.amount': 'Titel',
      'resources.groups.subResources.entries.title': 'Boekingen',
      'resources.groups.subResources.entries.columns.amount': 'Bedrag',
    });
  });

  it('translates a top-level resource via flat keys', () => {
    const out = localizeDefinition(def('books', 'books'));
    expect(out.title).toBe('Boeken');
    expect(out.schemas.table.columns[0].label).toBe('Titel');
  });

  it('translates a sub-resource via parent-scoped keys', () => {
    const out = localizeDefinition(def('groups/entries', 'entries'));
    expect(out.title).toBe('Boekingen');
    expect(out.schemas.table.columns[0].label).toBe('Bedrag');
    expect(
      (out.schemas.form.ui as { elements: Array<{ options: { label: string } }> }).elements[0]
        .options.label,
    ).toBe('Bedrag');
    expect(
      (out.schemas.form.data as { properties: { amount: { title: string } } }).properties.amount
        .title,
    ).toBe('Bedrag');
  });

  it('keeps the original label when no key resolves', () => {
    const out = localizeDefinition(def('groups/entries', 'entries'));
    // 'title' column has no bundle entry under groups.subResources.entries
    const tableData = out.schemas.table.data as {
      properties: Record<string, { title?: string }>;
    };
    expect(tableData.properties.amount.title).toBe('Bedrag');
  });

  it('falls back to flat keys when the bundle stores sub-resources flat', () => {
    delete bundle['resources.groups.subResources.entries.columns.amount'];
    Object.assign(bundle, { 'resources.entries.columns.amount': 'Bedrag (flat)' });
    const out = localizeDefinition(def('groups/entries', 'entries'));
    expect(out.schemas.table.columns[0].label).toBe('Bedrag (flat)');
  });
});
