import { beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { colorVariants } from './__tests__/color.variants';
import { mountControl } from './__tests__/mount-control';

const variant = (id: string) => {
  const found = colorVariants.find((v) => v.id === id);
  if (!found) throw new Error(`Unknown color variant "${id}"`);
  return found;
};

const mount = (id: string, opts?: Parameters<typeof mountControl>[1]) =>
  mountControl(variant(id), opts);

const picker = (root: ReturnType<typeof mount>['root']) =>
  root.getByLabelText('Value picker');

describe('ColorControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: empty hex text input next to a color picker', async () => {
      const { root, values } = mount('default');
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(input).toHaveValue('');
      await expect.element(input).toHaveAttribute('placeholder', '#rrggbb');
      await expect.element(picker(root)).toHaveAttribute('type', 'color');
      await input.fill('#123abc');
      await expect.poll(values).toEqual({ value: '#123abc' });
      await expect.element(picker(root)).toHaveValue('#123abc');
    });

    test('initial value is shown in text and picker', async () => {
      const { root } = mount('initial-value');
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveValue('#ff0000');
      await expect.element(picker(root)).toHaveValue('#ff0000');
    });

    test('picking a color updates the form value', async () => {
      const { root, values } = mount('default');
      const el = picker(root).element() as HTMLInputElement;
      el.value = '#00ff00';
      el.dispatchEvent(new Event('input', { bubbles: true }));

      await expect.poll(values).toEqual({ value: '#00ff00' });
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveValue('#00ff00');
    });

    test('invalid hex text keeps the picker on black', async () => {
      const { root } = mount('default');
      await root.getByRole('textbox', { name: 'Value' }).fill('red');
      await expect.element(picker(root)).toHaveValue('#000000');
    });
  });

  describe('label & layout', () => {
    test('label option overrides the label', async () => {
      const { root } = mount('label');
      await expect.element(root.getByRole('textbox', { name: 'Custom label' })).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder option overrides the default', async () => {
      const { root } = mount('placeholder');
      await expect
        .element(root.getByRole('textbox', { name: 'Value' }))
        .toHaveAttribute('placeholder', 'Pick a color');
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
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await root.getByRole('textbox', { name: 'Value' }).clear();
      await userEvent.tab();
      await expect.element(root.getByText('Please pick a color')).toBeVisible();
    });
  });

  describe('state', () => {
    test('form-level readonly renders a swatch with the hex value', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('#0000ff')).toBeVisible();
      await expect.element(root.getByRole('textbox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: text and picker disabled', async (id) => {
      const { root } = mount(id);
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toBeDisabled();
      await expect.element(picker(root)).toBeDisabled();
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(input).toBeEnabled();
      await root.getByRole('textbox', { name: 'Lock' }).fill('x');
      await expect.element(input).toBeDisabled();
    });
  });
});
