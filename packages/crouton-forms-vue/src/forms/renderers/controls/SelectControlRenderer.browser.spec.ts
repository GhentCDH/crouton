import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { fakeHttp } from './__tests__/fake-http';
import { mountControl } from './__tests__/mount-control';
import { selectVariants } from './__tests__/select.variants';

const mount = (id: string) => {
  const variant = selectVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown select variant "${id}"`);
  return mountControl(variant, { http: fakeHttp() });
};

type Root = ReturnType<typeof mount>['root'];
const combo = (root: Root, name = 'Value') => root.getByRole('combobox', { name });
// The listbox is a top-layer popover, so query it from the page.
const option = (name: string) => page.getByRole('listbox').getByRole('option', { name, exact: true });
const pick = async (root: Root, name: string, label = 'Value') => {
  await combo(root, label).click();
  await option(name).click();
};

describe('SelectControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: placeholder text, opening lists every option', async () => {
      const { root } = mount('default');
      await expect.element(combo(root)).toHaveTextContent('Select value');
      await combo(root).click();
      for (const name of ['Draft', 'Published', 'Archived']) await expect.element(option(name)).toBeVisible();
    });

    test('combobox reports expanded state', async () => {
      const { root } = mount('default');
      await expect.element(combo(root)).toHaveAttribute('aria-expanded', 'false');
      await combo(root).click();
      await expect.element(combo(root)).toHaveAttribute('aria-expanded', 'true');
    });

    test('without storeValue the whole option object is stored', async () => {
      const { root, values } = mount('default');
      await pick(root, 'Published');
      await expect.element(combo(root)).toHaveTextContent('Published');
      await expect.poll(values).toEqual({ value: { label: 'Published', value: 'published' } });
    });

    test('initial object value shows its label', async () => {
      const { root } = mount('initial-object');
      await expect.element(combo(root)).toHaveTextContent('Published');
    });

    test('storeValue stores the option value', async () => {
      const { root, values } = mount('store-value');
      await pick(root, 'Archived');
      await expect.poll(values).toEqual({ value: 'archived' });
    });

    test('initial scalar value shows its label', async () => {
      const { root } = mount('initial-scalar');
      await expect.element(combo(root)).toHaveTextContent('Archived');
    });

    test('a falsy option value (0) is shown as selected', async () => {
      const { root } = mount('falsy-value');
      await expect.element(combo(root)).toHaveTextContent('None');
    });

    test('`values` works as the option list', async () => {
      const { root, values } = mount('values-alias');
      await pick(root, 'Draft');
      await expect.poll(values).toEqual({ value: 'draft' });
    });

    test('displayValues resolves a label outside the restricted `values`', async () => {
      const { root } = mount('display-values');
      await expect.element(combo(root)).toHaveTextContent('Archived');
      await combo(root).click();
      await expect.element(option('Draft')).toBeVisible();
      await expect.element(option('Archived')).not.toBeInTheDocument();
    });

    test('exposes data-control-id for the testing harnesses (byId, clear)', async () => {
      const { root } = mount('clearable');
      const wrapper = root.element().querySelector('[data-control-id="value"]');
      expect(wrapper?.querySelector('[role="combobox"]')).not.toBeNull();
      expect(wrapper?.querySelector('button[aria-label="Clear"]')).not.toBeNull();
    });

    test('labelKey / valueKey pick the label and stored value', async () => {
      const { root, values } = mount('custom-keys');
      await pick(root, 'France');
      await expect.poll(values).toEqual({ value: 'FR' });
    });
  });

  describe('keyboard', () => {
    test('ArrowDown + Enter selects, Escape closes', async () => {
      const { root, values } = mount('store-value');
      await combo(root).click();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      await expect.poll(values).toEqual({ value: 'published' });

      await combo(root).click();
      await expect.element(page.getByRole('listbox')).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.element(page.getByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('clearable', () => {
    test('true: clear button empties the value', async () => {
      const { root, values } = mount('clearable');
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.poll(() => values()?.['value'] ?? null).toBeNull();
      await expect.element(combo(root)).toHaveTextContent('Select value');
    });

    test('false: no clear button', async () => {
      const { root } = mount('not-clearable');
      await expect.element(combo(root)).toHaveTextContent('Draft');
      await expect.element(root.getByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });
  });

  describe('remote options', () => {
    test('uri: options come from the endpoint (flat array)', async () => {
      const { root, values } = mount('remote-uri');
      await pick(root, 'Netherlands');
      await expect.poll(values).toEqual({ value: 'NL' });
    });

    test('dataField: options are read from the given response field', async () => {
      const { root, values } = mount('remote-data-field');
      await pick(root, 'Belgium');
      await expect.poll(values).toEqual({ value: 'BE' });
    });

    test('a failing endpoint leaves the list empty without breaking the form', async () => {
      const { root } = mount('remote-error');
      await combo(root).click();
      await expect.element(page.getByRole('listbox').getByRole('option')).not.toBeInTheDocument();
      await expect.element(combo(root)).toBeEnabled();
    });

    test('resource: options come from the resource lookup operation', async () => {
      const { root, values } = mount('remote-resource');
      await pick(root, 'Belgium');
      await expect.poll(values).toEqual({ value: 'BE' });
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
      await expect.element(root.getByText('Pick a status')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(combo(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder replaces the default empty text', async () => {
      const { root } = mount('placeholder');
      await expect.element(combo(root)).toHaveTextContent('Choose a status');
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
    test('required: clearing shows the required error, picking removes it', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await pick(root, 'Published');
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await root.getByRole('button', { name: 'Clear' }).click();
      await expect.element(root.getByText('Please pick a status')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the label without a combobox', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('Published')).toBeVisible();
      await expect.element(root.getByRole('combobox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: combobox disabled, label shown', async (id) => {
      const { root } = mount(id);
      await expect.element(combo(root)).toBeDisabled();
      await expect.element(combo(root)).toHaveTextContent('Published');
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

    test.each(selectVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`select-${id}`);
    });

    test('open dropdown', async () => {
      const { root } = mount('initial-scalar');
      await combo(root).click();
      await expect.element(page.getByRole('listbox')).toBeVisible();
      await parkPointer();
      await expect.element(page.getByRole('listbox')).toMatchScreenshot('select-open-listbox');
    });
  });
});
