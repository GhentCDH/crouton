import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { mountControl } from './__tests__/mount-control';
import { toggleVariants } from './__tests__/toggle.variants';

const mount = (id: string) => {
  const variant = toggleVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown toggle variant "${id}"`);
  return mountControl(variant);
};

type Root = ReturnType<typeof mount>['root'];
const button = (root: Root, name: string) => root.getByRole('button', { name, exact: true });
const expectPressed = async (root: Root, name: string, pressed: boolean) =>
  expect.element(button(root, name)).toHaveAttribute('aria-pressed', String(pressed));

describe('ToggleControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: one button per option, none pressed', async () => {
      const { root, values } = mount('default');
      for (const name of ['Small', 'Medium', 'Large']) await expectPressed(root, name, false);
      expect(values()?.['value']).toBeUndefined();
    });

    test('without storeValue the whole option object is stored', async () => {
      const { root, values } = mount('default');
      await button(root, 'Medium').click();
      await expectPressed(root, 'Medium', true);
      await expect.poll(values).toEqual({ value: { label: 'Medium', value: 'm' } });
    });

    test('initial object value marks its option pressed', async () => {
      const { root } = mount('initial-object');
      await expectPressed(root, 'Medium', true);
      await expectPressed(root, 'Small', false);
    });

    test('storeValue stores the option value', async () => {
      const { root, values } = mount('store-value');
      await button(root, 'Large').click();
      await expect.poll(values).toEqual({ value: 'l' });
    });

    test('initial scalar value marks its option pressed', async () => {
      const { root } = mount('initial-scalar');
      await expectPressed(root, 'Large', true);
    });

    test('selecting another option moves the pressed state', async () => {
      const { root, values } = mount('initial-scalar');
      await button(root, 'Small').click();
      await expectPressed(root, 'Small', true);
      await expectPressed(root, 'Large', false);
      await expect.poll(values).toEqual({ value: 's' });
    });

    test('boolean option values: false is a real selection', async () => {
      const { root, values } = mount('boolean-values');
      await expectPressed(root, 'No', true);
      await button(root, 'Yes').click();
      await expect.poll(values).toEqual({ value: true });
    });

    test('scalar options use the value as label', async () => {
      const { root, values } = mount('scalar-options');
      await button(root, 'Green').click();
      await expect.poll(values).toEqual({ value: 'Green' });
    });

    test('deprecated `values` alias still renders options', async () => {
      const { root, values } = mount('values-alias');
      await button(root, 'Two').click();
      await expect.poll(values).toEqual({ value: 'Two' });
    });

    test('labelKey / valueKey pick the label and stored value', async () => {
      const { root, values } = mount('custom-keys');
      await button(root, 'Final').click();
      await expect.poll(values).toEqual({ value: 'F' });
    });
  });

  describe('clearable', () => {
    test('default (true): clicking the pressed option clears the value', async () => {
      const { root, values } = mount('initial-scalar');
      await button(root, 'Large').click();
      await expectPressed(root, 'Large', false);
      await expect.poll(() => values()?.['value']).toBeUndefined();
    });

    test('false: clicking the pressed option keeps it', async () => {
      const { root, values } = mount('not-clearable');
      await button(root, 'Small').click();
      await expectPressed(root, 'Small', true);
      await expect.poll(values).toEqual({ value: 's' });
    });
  });

  describe('appearance', () => {
    test('color applies to the pressed button only', async () => {
      const { root } = mount('color');
      // `secondary` maps to `btn-soft btn-primary` in the design system.
      await expect.element(button(root, 'Medium')).toHaveClass(/btn-soft/);
      await expect.element(button(root, 'Small')).not.toHaveClass(/btn-soft/);
    });

    test('size applies to every button', async () => {
      const { root } = mount('size');
      for (const name of ['Small', 'Medium', 'Large']) {
        await expect.element(button(root, name)).toHaveClass(/btn-xs/);
      }
    });
  });

  describe('label & layout', () => {
    test('label names the group', async () => {
      const { root } = mount('label');
      await expect.element(root.getByRole('group', { name: 'Custom label' })).toBeVisible();
    });

    test('schema title names the group', async () => {
      const { root } = mount('schema-title');
      await expect.element(root.getByRole('group', { name: 'Schema title' })).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Pick one size')).toBeVisible();
    });

    test('hideLabel hides the label text', async () => {
      const { root } = mount('hide-label');
      await expect.element(button(root, 'Small')).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-48/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });

    test('styles override the label classes', async () => {
      const { root } = mount('styles');
      await expect.element(root.getByText('Value', { exact: true })).toBeVisible();
      expect(root.element().querySelector('legend')?.className).toMatch(/text-error/);
    });
  });

  describe('validation', () => {
    test('required: clearing the selection shows the required error', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await button(root, 'Small').click();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await button(root, 'Medium').click();
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await button(root, 'Small').click();
      await expect.element(root.getByText('Please pick a size')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the value without buttons', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByRole('button')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: buttons disabled, value kept', async (id) => {
      const { root, values } = mount(id);
      for (const name of ['Small', 'Medium', 'Large']) await expect.element(button(root, name)).toBeDisabled();
      await expectPressed(root, 'Medium', true);
      await button(root, 'Small').click({ force: true });
      await expect.poll(values).toEqual({ value: 'm' });
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(button(root, 'Small')).toBeEnabled();
      await lock.fill('x');
      await expect.element(button(root, 'Small')).toBeDisabled();
      await lock.clear();
      await expect.element(button(root, 'Small')).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(toggleVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`toggle-${id}`);
    });
  });
});
