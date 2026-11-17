import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { booleanVariants } from './__tests__/boolean.variants';
import { mountControl } from './__tests__/mount-control';

const mount = (id: string) => {
  const variant = booleanVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown boolean variant "${id}"`);
  return mountControl(variant);
};

const checkbox = (root: ReturnType<typeof mount>['root'], name = 'Value') =>
  root.getByRole('checkbox', { name });

describe('BooleanControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: unchecked, labelled from the property name, stores false', async () => {
      const { root, values } = mount('default');
      await expect.element(checkbox(root)).not.toBeChecked();
      await expect.poll(values).toEqual({ value: false });
    });

    test('clicking toggles and stores true / false', async () => {
      const { root, values } = mount('default');
      await checkbox(root).click();
      await expect.element(checkbox(root)).toBeChecked();
      await expect.poll(values).toEqual({ value: true });

      await checkbox(root).click();
      await expect.element(checkbox(root)).not.toBeChecked();
      await expect.poll(values).toEqual({ value: false });
    });

    test('clicking the label text toggles', async () => {
      const { root, values } = mount('default');
      await root.getByText('Value', { exact: true }).click();
      await expect.poll(values).toEqual({ value: true });
    });

    test('Space toggles when focused', async () => {
      const { root, values } = mount('default');
      await checkbox(root).click();
      await userEvent.keyboard(' ');
      await expect.poll(values).toEqual({ value: false });
    });

    test.each([
      ['checked', true],
      ['unchecked', false],
    ])('%s initial value', async (id, checked) => {
      const { root } = mount(id);
      if (checked) await expect.element(checkbox(root)).toBeChecked();
      else await expect.element(checkbox(root)).not.toBeChecked();
    });

    test('null value renders unchecked', async () => {
      const { root } = mount('null-value');
      await expect.element(checkbox(root)).not.toBeChecked();
    });

    test('format: boolean option selects the checkbox for a non-boolean schema', async () => {
      const { root } = mount('format-option');
      await expect.element(checkbox(root)).toBeVisible();
    });
  });

  describe('label & help', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(checkbox(root, 'Custom label')).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(checkbox(root, 'Schema title')).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Shown below the checkbox')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(checkbox(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });
  });

  describe('layout options', () => {
    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group')).toHaveClass(/w-48/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group')).toHaveClass(/w-full/);
    });

    test('styles override the checkbox classes', async () => {
      const { root } = mount('styles');
      await expect.element(checkbox(root)).toHaveClass(/checkbox-primary/);
    });
  });

  describe('validation', () => {
    test('required: unchecked (false) is a valid value', async () => {
      const { root, values } = mount('required');
      await checkbox(root).click();
      await checkbox(root).click();
      await expect.poll(values).toEqual({ value: false });
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await expect.element(root.getByText('Please accept')).toBeVisible();
      await checkbox(root).click();
      await expect.element(root.getByText('Please accept')).not.toBeInTheDocument();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly renders the value without a checkbox input', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByRole('checkbox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: checked and disabled', async (id) => {
      const { root, values } = mount(id);
      await expect.element(checkbox(root)).toBeChecked();
      await expect.element(checkbox(root)).toBeDisabled();
      await checkbox(root).click({ force: true });
      await expect.poll(values).toEqual({ value: true });
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(checkbox(root)).toBeEnabled();
      await lock.fill('x');
      await expect.element(checkbox(root)).toBeDisabled();
      await lock.clear();
      await expect.element(checkbox(root)).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(booleanVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`boolean-${id}`);
    });
  });
});
