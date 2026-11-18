import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { autocompleteVariants } from './__tests__/autocomplete.variants';
import { fakeHttp } from './__tests__/fake-http';
import { mountControl } from './__tests__/mount-control';

const mount = (id: string) => {
  const variant = autocompleteVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown autocomplete variant "${id}"`);
  return mountControl(variant, { http: fakeHttp() });
};

type Root = ReturnType<typeof mount>['root'];
const input = (root: Root, name = 'Value') => root.getByRole('combobox', { name });
const listbox = () => page.getByRole('listbox');
const option = (name: string) => listbox().getByRole('option', { name, exact: true });
const pick = async (root: Root, text: string, name: string) => {
  await input(root).fill(text);
  await option(name).click();
};

describe('AutocompleteControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('inline options', () => {
    test('typing filters the options', async () => {
      const { root } = mount('inline');
      await input(root).fill('an');
      await expect.element(option('France')).toBeVisible();
      await expect.element(option('Belgium')).not.toBeInTheDocument();
    });

    test('without storeValue the record (valueKey + labelKey) is stored', async () => {
      const { root, values } = mount('inline');
      await pick(root, 'Bel', 'Belgium');
      await expect.element(input(root)).toHaveValue('Belgium');
      await expect.poll(values).toEqual({ value: { code: 'BE', name: 'Belgium' } });
    });

    test('storeValue stores the value key', async () => {
      const { root, values } = mount('inline-store-value');
      await pick(root, 'Neth', 'Netherlands');
      await expect.poll(values).toEqual({ value: 'NL' });
    });

    test('initial object value shows its label', async () => {
      const { root } = mount('inline-initial-object');
      await expect.element(input(root)).toHaveValue('Belgium');
    });

    test('initial scalar value shows the matching label', async () => {
      const { root } = mount('inline-initial-scalar');
      await expect.element(input(root)).toHaveValue('Netherlands');
    });

    test('deprecated `values` alias works as the option list', async () => {
      const { root, values } = mount('values-alias');
      await pick(root, 'Fra', 'France');
      await expect.poll(values).toEqual({ value: 'FR' });
    });

    test('keyboard: ArrowDown + Enter selects', async () => {
      const { root, values } = mount('inline-store-value');
      await input(root).fill('e');
      await expect.element(listbox()).toBeVisible();
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect.poll(values).toEqual({ value: 'BE' });
    });

    test('combobox reports expanded state', async () => {
      const { root } = mount('inline-store-value');
      await expect.element(input(root)).toHaveAttribute('aria-expanded', 'false');
      await input(root).fill('B');
      await expect.element(input(root)).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('remote options', () => {
    test.each(['remote-uri', 'remote-data-field', 'remote-resource'])('%s: the search term reaches the server', async (id) => {
      const { root, values } = mount(id);
      await input(root).fill('Fra');
      await expect.element(option('France')).toBeVisible();
      await expect.element(option('Belgium')).not.toBeInTheDocument();
      await option('France').click();
      await expect.poll(values).toEqual({ value: 'FR' });
    });

    test('resource: a stored id is shown as its label', async () => {
      const { root } = mount('resource-initial-scalar');
      await expect.element(input(root)).toHaveValue('France');
    });
  });

  describe('freeText, create, exclude', () => {
    test('freeText keeps a typed value that is not an option', async () => {
      const { root, values } = mount('free-text');
      await input(root).fill('Atlantis');
      await userEvent.tab();
      await expect.element(input(root)).toHaveValue('Atlantis');
      await expect.poll(() => values()?.['value']).toBe('Atlantis');
    });

    test('without freeText an unmatched text is cleared on blur', async () => {
      const { root } = mount('inline-store-value');
      await input(root).fill('Atlantis');
      await userEvent.tab();
      await expect.element(input(root)).toHaveValue('');
    });

    test('enableCreate shows a create button', async () => {
      const { root } = mount('enable-create');
      await expect.element(root.getByRole('button', { name: 'create' })).toBeVisible();
    });

    test('create dispatches a form event whose onSuccess sets the new value', async () => {
      const { root, values, events } = mount('enable-create');
      await root.getByRole('button', { name: 'create' }).click();
      await expect.poll(() => events().length).toBe(1);

      const event = events()[0] as { event: string; type: string; onSuccess: (r: unknown) => void };
      expect(event).toMatchObject({ event: 'create', type: 'value' });
      event.onSuccess({ code: 'LU', name: 'Luxembourg' });
      await expect.poll(values).toEqual({ value: 'LU' });
      await expect.element(input(root)).toHaveValue('Luxembourg');
    });

    test('no create button by default', async () => {
      const { root } = mount('inline-store-value');
      await expect.element(root.getByRole('button', { name: 'create' })).not.toBeInTheDocument();
    });

    test('exclude.values hides the listed values', async () => {
      const { root } = mount('exclude-values');
      await input(root).fill('e');
      await expect.element(option('France')).toBeVisible();
      await expect.element(option('Belgium')).not.toBeInTheDocument();
    });

    test('exclude.values with a {form.path} hides the value of another field', async () => {
      const { root } = mount('exclude-form-path');
      await root.getByRole('textbox', { name: 'Other' }).fill('FR');
      await input(root).fill('e');
      await expect.element(option('Belgium')).toBeVisible();
      await expect.element(option('France')).not.toBeInTheDocument();
    });
  });

  describe('label & layout', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(input(root, 'Custom label')).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(input(root, 'Schema title')).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Start typing a country')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(input(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder is shown when empty', async () => {
      const { root } = mount('placeholder');
      await expect.element(input(root)).toHaveAttribute('placeholder', 'Search countries…');
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-48/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });

    test('styles override the input classes', async () => {
      const { root } = mount('styles');
      await expect.element(input(root)).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('required: clearing the text shows the required error', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await input(root).clear();
      await userEvent.tab();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await pick(root, 'Fra', 'France');
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await input(root).clear();
      await userEvent.tab();
      await expect.element(root.getByText('Please pick a country')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the label without an input', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('Belgium')).toBeVisible();
      await expect.element(root.getByRole('combobox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: input disabled, label shown', async (id) => {
      const { root } = mount(id);
      await expect.element(input(root)).toBeDisabled();
      await expect.element(input(root)).toHaveValue('Belgium');
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(input(root)).toBeEnabled();
      await lock.fill('x');
      await expect.element(input(root)).toBeDisabled();
      await lock.clear();
      await expect.element(input(root)).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(autocompleteVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`autocomplete-${id}`);
    });

    test('open list while typing', async () => {
      const { root } = mount('inline-store-value');
      await input(root).fill('e');
      await expect.element(listbox()).toBeVisible();
      await parkPointer();
      await expect.element(listbox()).toMatchScreenshot('autocomplete-open-listbox');
    });
  });
});
