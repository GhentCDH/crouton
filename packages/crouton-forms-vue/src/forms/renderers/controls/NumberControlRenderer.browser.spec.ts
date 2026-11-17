import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { mountControl } from './__tests__/mount-control';
import { numberVariants } from './__tests__/number.variants';

const mount = (id: string) => {
  const variant = numberVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown number variant "${id}"`);
  return mountControl(variant);
};

const blur = () => userEvent.tab();

describe('NumberControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: empty number input labelled from the property name; typing stores a number', async () => {
      const { root, values } = mount('default');
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await expect.element(input).toHaveValue(null);
      await input.fill('12.5');
      await expect.poll(values).toEqual({ value: 12.5 });
    });

    test('integer: step 1, stores an integer', async () => {
      const { root, values } = mount('integer');
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await expect.element(input).toHaveAttribute('step', '1');
      await input.fill('3');
      await expect.poll(values).toEqual({ value: 3 });
    });

    test('number: decimal step', async () => {
      const { root } = mount('default');
      await expect.element(root.getByRole('spinbutton', { name: 'Value' })).toHaveAttribute('step', '0.01');
    });

    test.each([
      ['initial-value', 42],
      ['decimal', 3.14],
      ['zero', 0],
      ['negative', -5],
    ])('%s: shows %s', async (id, expected) => {
      const { root } = mount(id);
      await expect.element(root.getByRole('spinbutton', { name: 'Value' })).toHaveValue(expected);
    });

    test('null value renders an empty input', async () => {
      const { root } = mount('null-value');
      await expect.element(root.getByRole('spinbutton', { name: 'Value' })).toHaveValue(null);
    });

    test('clearing an optional number stores no value and shows no error', async () => {
      const { root, values } = mount('initial-value');
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await input.clear();
      await blur();
      await expect.poll(() => values()?.['value'] ?? null).toBeNull();
      await expect.element(root.getByRole('group', { name: 'Value' }).getByRole('paragraph')).toHaveTextContent('');
    });

    test('arrow keys step the value', async () => {
      const { root, values } = mount('integer');
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await input.fill('5');
      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      await expect.poll(values).toEqual({ value: 7 });
    });
  });

  describe('label & help', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(root.getByRole('spinbutton', { name: 'Custom label' })).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(root.getByRole('spinbutton', { name: 'Schema title' })).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Shown below the input')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(root.getByRole('spinbutton', { name: 'Value' })).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder is shown when empty', async () => {
      const { root } = mount('placeholder');
      await expect
        .element(root.getByRole('spinbutton', { name: 'Value' }))
        .toHaveAttribute('placeholder', 'Enter a number');
    });
  });

  describe('layout options', () => {
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
      await expect.element(root.getByRole('spinbutton', { name: 'Value' })).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('required: * marker, error when cleared, gone when refilled', async () => {
      const { root } = mount('required');
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await input.clear();
      await blur();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await input.fill('8');
      await blur();
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await root.getByRole('spinbutton', { name: 'Value' }).clear();
      await blur();
      await expect.element(root.getByText('Please enter a number')).toBeVisible();
    });

    test('minimum', async () => {
      const { root } = mount('minimum');
      await root.getByRole('spinbutton', { name: 'Value' }).fill('5');
      await blur();
      await expect.element(root.getByText('Minimum value is 10')).toBeVisible();
    });

    test('maximum', async () => {
      const { root } = mount('maximum');
      await root.getByRole('spinbutton', { name: 'Value' }).fill('101');
      await blur();
      await expect.element(root.getByText('Maximum value is 100')).toBeVisible();
    });

    test('integer rejects decimals', async () => {
      const { root } = mount('integer-decimal');
      await root.getByRole('spinbutton', { name: 'Value' }).fill('1.5');
      await blur();
      await expect.element(root.getByText('Must be a whole number')).toBeVisible();
    });

    test('errorMode always: error visible without interaction', async () => {
      const { root } = mount('error-mode-always');
      await expect.element(root.getByText('This field is required')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly renders the value as text, without an input', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('13')).toBeVisible();
      await expect.element(root.getByRole('spinbutton')).not.toBeInTheDocument();
    });

    test.each([
      ['readonly', 12],
      ['disabled', 14],
    ])('%s: value shown, input disabled', async (id, expected) => {
      const { root } = mount(id);
      const input = root.getByRole('spinbutton', { name: 'Value' });
      await expect.element(input).toBeDisabled();
      await expect.element(input).toHaveValue(expected);
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });
      const input = root.getByRole('spinbutton', { name: 'Value' });

      await expect.element(input).toBeEnabled();
      await lock.fill('x');
      await expect.element(input).toBeDisabled();
      await lock.clear();
      await expect.element(input).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(numberVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`number-${id}`);
    });

    test('minimum error state', async () => {
      const { root } = mount('minimum');
      await root.getByRole('spinbutton', { name: 'Value' }).fill('5');
      await blur();
      await expect.element(root.getByText('Minimum value is 10')).toBeVisible();
      await parkPointer();
      await expect.element(root).toMatchScreenshot('number-minimum-error');
    });
  });
});
