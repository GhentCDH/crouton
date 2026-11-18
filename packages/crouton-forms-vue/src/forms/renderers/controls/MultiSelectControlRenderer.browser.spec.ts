import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { fakeHttp } from './__tests__/fake-http';
import { mountControl } from './__tests__/mount-control';
import { multiSelectVariants } from './__tests__/multiselect.variants';

const mount = (id: string) => {
  const variant = multiSelectVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown multiSelect variant "${id}"`);
  return mountControl(variant, { http: fakeHttp() });
};

type Root = ReturnType<typeof mount>['root'];
const combo = (root: Root, name = 'Value') => root.getByRole('combobox', { name });
const option = (name: string) => page.getByRole('listbox').getByRole('option', { name, exact: true });
const toggle = async (root: Root, ...names: string[]) => {
  await combo(root).click();
  for (const name of names) await option(name).click();
  await userEvent.keyboard('{Escape}');
};

describe('MultiSelectControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: placeholder text, list stays open while picking several options', async () => {
      const { root, values } = mount('default');
      await expect.element(combo(root)).toHaveTextContent('Select value');
      await combo(root).click();
      await option('Draft').click();
      await expect.element(page.getByRole('listbox')).toBeVisible();
      await option('Archived').click();
      await expect.poll(values).toEqual({
        value: JSON.stringify([STATUS('Draft'), STATUS('Archived')]),
      });
    });

    test('combobox reports expanded state', async () => {
      const { root } = mount('default');
      await expect.element(combo(root)).toHaveAttribute('aria-expanded', 'false');
      await combo(root).click();
      await expect.element(combo(root)).toHaveAttribute('aria-expanded', 'true');
    });

    test('storeValue stores the option values (as a JSON string for a string column)', async () => {
      const { root, values } = mount('store-value');
      await toggle(root, 'Draft', 'Published');
      await expect.element(combo(root)).toHaveTextContent('Draft, Published');
      await expect.poll(values).toEqual({ value: '["draft","published"]' });
    });

    test('clicking a selected option deselects it', async () => {
      const { root, values } = mount('initial-json-string');
      await toggle(root, 'Draft');
      await expect.poll(values).toEqual({ value: '["archived"]' });
    });

    test('initial JSON string value shows the labels', async () => {
      const { root } = mount('initial-json-string');
      await expect.element(combo(root)).toHaveTextContent('Draft, Archived');
    });

    test('array schema: stores a real array', async () => {
      const { root, values } = mount('array-schema');
      await toggle(root, 'Archived');
      await expect.poll(values).toEqual({ value: ['archived'] });
    });

    test('initial array value shows the labels', async () => {
      const { root } = mount('initial-array');
      await expect.element(combo(root)).toHaveTextContent('Published');
    });

    test('`values` works as the option list', async () => {
      const { root, values } = mount('values-alias');
      await toggle(root, 'Draft');
      await expect.poll(values).toEqual({ value: '["draft"]' });
    });

    test('displayValues resolves labels outside the restricted `values`', async () => {
      const { root } = mount('display-values');
      await expect.element(combo(root)).toHaveTextContent('Draft, Archived');
      await combo(root).click();
      await expect.element(option('Archived')).not.toBeInTheDocument();
    });

    test('labelKey / valueKey pick the label and stored value', async () => {
      const { root, values } = mount('custom-keys');
      await toggle(root, 'France');
      await expect.poll(values).toEqual({ value: '["FR"]' });
    });
  });

  describe('clearable', () => {
    test('true: clear button empties the selection', async () => {
      const { root, values } = mount('clearable');
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.poll(values).toEqual({ value: '[]' });
      await expect.element(combo(root)).toHaveTextContent('Select value');
    });

    test('false: no clear button', async () => {
      const { root } = mount('not-clearable');
      await expect.element(combo(root)).toHaveTextContent('Draft');
      await expect.element(root.getByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });
  });

  describe('remote options', () => {
    test.each(['remote-uri', 'remote-data-field', 'remote-resource'])('%s: options come from the server', async (id) => {
      const { root, values } = mount(id);
      await toggle(root, 'Belgium', 'Netherlands');
      await expect.poll(values).toEqual({ value: '["BE","NL"]' });
    });
  });

  describe('label & layout', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(combo(root, 'Custom label')).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(combo(root, 'Schema title')).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Pick any statuses')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(combo(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder replaces the default empty text', async () => {
      const { root } = mount('placeholder');
      await expect.element(combo(root)).toHaveTextContent('Choose statuses');
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-48/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });

    test('styles override the select classes', async () => {
      const { root } = mount('styles');
      await expect.element(combo(root)).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('required (minItems 1): clearing shows an error, picking removes it', async () => {
      const { root } = mount('required');
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.element(root.getByRole('group', { name: 'Value*' }).getByRole('paragraph')).not.toHaveTextContent('');
      await toggle(root, 'Published');
      await expect.element(root.getByRole('group', { name: 'Value*' }).getByRole('paragraph')).toHaveTextContent('');
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.element(root.getByText('Pick at least one status')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the labels without a combobox', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('Draft, Published')).toBeVisible();
      await expect.element(root.getByRole('combobox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: combobox disabled, labels shown', async (id) => {
      const { root } = mount(id);
      await expect.element(combo(root)).toBeDisabled();
      await expect.element(combo(root)).toHaveTextContent('Draft, Published');
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(combo(root)).toBeEnabled();
      await lock.fill('x');
      await expect.element(combo(root)).toBeDisabled();
      await lock.clear();
      await expect.element(combo(root)).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(multiSelectVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`multiselect-${id}`);
    });

    test('open list with two selected', async () => {
      const { root } = mount('initial-json-string');
      await combo(root).click();
      await expect.element(page.getByRole('listbox')).toBeVisible();
      await parkPointer();
      await expect.element(page.getByRole('listbox')).toMatchScreenshot('multiselect-open-listbox');
    });
  });
});

const STATUS = (label: string) => ({ label, value: label.toLowerCase() });
