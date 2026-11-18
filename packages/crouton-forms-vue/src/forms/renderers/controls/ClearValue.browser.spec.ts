import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { type ControlVariant, singleControl } from './__tests__/control-variant';
import { mountControl } from './__tests__/mount-control';

/**
 * Clearing a control stores the form's empty value: `null` in API-backed forms
 * (`optionalPropertiesNullable`, as crouton-vue renders them) so the autosave
 * PATCH carries the key; `undefined` in a standalone form, where an optional
 * field must stay valid.
 */
type Case = {
  name: string;
  variant: (nullable: boolean) => ControlVariant;
  clear: (root: ReturnType<typeof mountControl>['root']) => Promise<unknown>;
};

const OPTIONS = [
  { label: 'Small', value: 's' },
  { label: 'Large', value: 'l' },
];

const form = (nullable: boolean) => ({ optionalPropertiesNullable: nullable });

const cases: Case[] = [
  {
    name: 'number',
    variant: (n) => singleControl('number', { property: { type: 'number' }, formData: { value: 4 }, form: form(n) }),
    clear: async (root) => {
      await root.getByRole('spinbutton', { name: 'Value' }).clear();
      await userEvent.tab();
    },
  },
  {
    name: 'select',
    variant: (n) =>
      singleControl('select', {
        property: { type: 'string' },
        options: { format: 'select', options: OPTIONS, storeValue: true, clearable: true },
        formData: { value: 's' },
        form: form(n),
      }),
    clear: (root) => root.getByRole('button', { name: 'Clear' }).click(),
  },
  {
    name: 'toggle',
    variant: (n) =>
      singleControl('toggle', {
        property: { type: 'string' },
        options: { format: 'toggle', options: OPTIONS, storeValue: true },
        formData: { value: 's' },
        form: form(n),
      }),
    clear: (root) => root.getByRole('button', { name: 'Small', exact: true }).click(),
  },
  {
    name: 'autocomplete',
    variant: (n) =>
      singleControl('autocomplete', {
        property: { type: 'string' },
        options: { format: 'autocomplete', options: OPTIONS, storeValue: true },
        formData: { value: 's' },
        form: form(n),
      }),
    clear: async (root) => {
      await root.getByRole('combobox', { name: 'Value' }).clear();
      await userEvent.tab();
    },
  },
  {
    name: 'date',
    variant: (n) =>
      singleControl('date', {
        property: { type: 'string', format: 'date' },
        formData: { value: '2024-05-01' },
        form: form(n),
      }),
    clear: async (root) => {
      const input = root.element().querySelector('input');
      if (!input) throw new Error('date input not found');
      await userEvent.fill(page.elementLocator(input), '');
    },
  },
];

describe('clearing a control stores the form empty value', () => {
  beforeEach(() => cleanup());

  test.each(cases)('$name: null in an API-backed (nullable) form', async ({ variant, clear }) => {
    const { root, values } = mountControl(variant(true));
    await clear(root);
    await expect.poll(() => values()).toHaveProperty('value', null);
    expect(JSON.parse(JSON.stringify(values()))).toEqual({ value: null });
  });

  test.each(cases)('$name: undefined (still valid) in a standalone form', async ({ variant, clear }) => {
    const { root, values } = mountControl(variant(false));
    await clear(root);
    await expect.poll(() => values() !== undefined && values()?.['value'] === undefined).toBe(true);
    await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
  });
});
