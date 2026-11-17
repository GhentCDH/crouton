import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { mountControl } from './__tests__/mount-control';
import { stringVariants } from './__tests__/string.variants';

const variant = (id: string) => {
  const found = stringVariants.find((v) => v.id === id);
  if (!found) throw new Error(`Unknown string variant "${id}"`);
  return found;
};

const mount = (id: string, opts?: Parameters<typeof mountControl>[1]) =>
  mountControl(variant(id), opts);

const blur = () => userEvent.tab();

describe('StringControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: empty text input labelled from the property name; typing updates the form value', async () => {
      const { root, values } = mount('default');
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(input).toHaveValue('');
      await expect.element(input).toHaveAttribute('type', 'text');
      await input.fill('abc');
      await expect.poll(values).toEqual({ value: 'abc' });
    });

    test('initial value is shown and editable', async () => {
      const { root, values } = mount('initial-value');
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(input).toHaveValue('Hello');
      await input.fill('Hello world');
      await expect.poll(values).toEqual({ value: 'Hello world' });
    });

    test('null value renders an empty input', async () => {
      const { root } = mount('null-value');
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveValue('');
    });

    test('nested scope writes to the nested path', async () => {
      const { root, values } = mount('nested');
      await root.getByRole('textbox', { name: 'Name' }).fill('Ada');
      await expect.poll(values).toEqual({ person: { name: 'Ada' } });
    });
  });

  describe('label & help', () => {
    test('label option overrides the label', async () => {
      const { root } = mount('label');
      await expect.element(root.getByRole('textbox', { name: 'Custom label' })).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(root.getByRole('textbox', { name: 'Schema title' })).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Shown below the input')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder is shown when empty', async () => {
      const { root } = mount('placeholder');
      await expect
        .element(root.getByRole('textbox', { name: 'Value' }))
        .toHaveAttribute('placeholder', 'Type here…');
    });
  });

  describe('clearable', () => {
    test('true: clear button empties the value', async () => {
      const { root, values } = mount('clearable');
      await root.getByRole('button', { name: 'Clear' }).click();

      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveValue('');
      await expect.poll(values).toEqual({ value: '' });
      await expect.element(root.getByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });

    test('false: no clear button', async () => {
      const { root } = mount('not-clearable');
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveValue('Keep me');
      await expect.element(root.getByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
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
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('required: * marker, error when cleared, gone when refilled', async () => {
      const { root } = mount('required');
      const group = root.getByRole('group', { name: 'Value*' });
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(group).toBeVisible();
      await expect.element(group.getByText('This field is required')).not.toBeInTheDocument();
      await input.clear();
      await blur();
      await expect.element(group.getByText('This field is required')).toBeVisible();
      await input.fill('again');
      await blur();
      await expect.element(group.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await root.getByRole('textbox', { name: 'Value' }).clear();
      await blur();

      const group = root.getByRole('group', { name: 'Value*' });
      await expect.element(group.getByText('Please fill this in')).toBeVisible();
      await expect.element(group.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('minLength', async () => {
      const { root } = mount('min-length');
      await root.getByRole('textbox', { name: 'Value' }).fill('ab');
      await blur();
      await expect.element(root.getByText('Must be at least 3 characters')).toBeVisible();
    });

    test('maxLength', async () => {
      const { root } = mount('max-length');
      await root.getByRole('textbox', { name: 'Value' }).fill('abcdef');
      await blur();
      await expect.element(root.getByText('Must be at most 5 characters')).toBeVisible();
    });

    test('pattern', async () => {
      const { root } = mount('pattern');
      const group = root.getByRole('group', { name: 'Value' });
      await root.getByRole('textbox', { name: 'Value' }).fill('ABC');
      await blur();
      await expect.element(group.getByText('Does not match the required pattern')).toBeVisible();
      await root.getByRole('textbox', { name: 'Value' }).fill('abc');
      await blur();
      await expect.element(group.getByText('Does not match the required pattern')).not.toBeInTheDocument();
    });

    test('errorMode always: error visible without interaction', async () => {
      const { root } = mount('error-mode-always');
      await expect.element(root.getByText('This field is required')).toBeVisible();
    });

    test('errorMode onChange: error as soon as the value changes, before blur', async () => {
      const { root } = mount('error-mode-on-change');
      await root.getByRole('textbox', { name: 'Value' }).clear();
      await expect.element(root.getByText('This field is required')).toBeVisible();
    });

    test('errorMode onSubmit: hidden on blur, shown after submit', async () => {
      const { root } = mount('error-mode-on-submit');
      const input = root.getByRole('textbox', { name: 'Value' });
      await input.clear();
      await blur();
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();

      await input.click();
      await userEvent.keyboard('{Enter}');
      await expect.element(root.getByText('This field is required')).toBeVisible();
    });

    test('invalid email format', async () => {
      const { root } = mount('email');
      await root.getByRole('textbox', { name: 'Value' }).fill('not-an-email');
      await blur();
      await expect.element(root.getByText('Must be a valid email')).toBeVisible();
    });

    test('unique: shows pending state, then the taken message', async () => {
      const { root } = mount('unique', {
        uniqueCheck: () => new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
      });

      await root.getByRole('textbox', { name: 'Value' }).fill('taken');
      await blur();
      await expect.element(root.getByText('Checking availability…')).toBeVisible();
      await expect.element(root.getByText('Name already taken')).toBeVisible();
      await expect.element(root.getByText('Checking availability…')).not.toBeInTheDocument();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly renders the value as text, without an input', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('Form read only')).toBeVisible();
      await expect.element(root.getByRole('textbox')).not.toBeInTheDocument();
    });

    test.each(['readonly', 'disabled'])('%s: value shown, input disabled', async (id) => {
      const { root } = mount(id);
      const input = root.getByRole('textbox', { name: 'Value' });
      await expect.element(input).toBeDisabled();
      await expect.element(input).not.toHaveValue('');
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });
      const input = root.getByRole('textbox', { name: 'Value' });

      await expect.element(input).toBeEnabled();
      await lock.fill('x');
      await expect.element(input).toBeDisabled();
      await lock.clear();
      await expect.element(input).toBeEnabled();
    });
  });

  describe('input type', () => {
    test.each([
      ['email', 'email'],
      ['uri', 'url'],
      ['format-text', 'text'],
    ])('%s → type="%s"', async (id, type) => {
      const { root } = mount(id);
      await expect.element(root.getByRole('textbox', { name: 'Value' })).toHaveAttribute('type', type);
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(stringVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`string-${id}`);
    });

    test('required error state', async () => {
      const { root } = mount('required');
      await root.getByRole('textbox', { name: 'Value' }).clear();
      await blur();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await parkPointer();
      await expect.element(root).toMatchScreenshot('string-required-error');
    });
  });
});
