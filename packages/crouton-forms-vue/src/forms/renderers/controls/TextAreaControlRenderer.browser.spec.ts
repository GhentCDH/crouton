import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { mountControl } from './__tests__/mount-control';
import { textareaVariants } from './__tests__/textarea.variants';

const mount = (id: string) => {
  const variant = textareaVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown textarea variant "${id}"`);
  return mountControl(variant);
};

const blur = () => userEvent.tab();
const box = (root: ReturnType<typeof mount>['root'], name = 'Value') =>
  root.getByRole('textbox', { name });

describe('TextAreaControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: empty textarea labelled from the property name; typing updates the form value', async () => {
      const { root, values } = mount('default');
      const textarea = box(root);

      await expect.element(textarea).toHaveValue('');
      expect(textarea.element().tagName).toBe('TEXTAREA');
      await textarea.fill('abc');
      await expect.poll(values).toEqual({ value: 'abc' });
    });

    test('multi-line value is kept, including newlines', async () => {
      const { root, values } = mount('initial-value');
      const textarea = box(root);

      await expect.element(textarea).toHaveValue('Line one\nLine two\nLine three');
      await textarea.fill('A\nB');
      await expect.poll(values).toEqual({ value: 'A\nB' });
    });

    test('Enter inserts a newline instead of submitting', async () => {
      const { root, values } = mount('default');
      await box(root).click();
      await userEvent.keyboard('first{Enter}second');
      await expect.poll(values).toEqual({ value: 'first\nsecond' });
    });

    test('null value renders an empty textarea', async () => {
      const { root } = mount('null-value');
      await expect.element(box(root)).toHaveValue('');
    });
  });

  describe('label & help', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(box(root, 'Custom label')).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(box(root, 'Schema title')).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Shown below the textarea')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(box(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('placeholder is shown when empty', async () => {
      const { root } = mount('placeholder');
      await expect.element(box(root)).toHaveAttribute('placeholder', 'Write something…');
    });
  });

  describe('size & layout', () => {
    test.each([
      ['height', 'height', '200px'],
      ['height-number', 'height', '240px'],
      ['min-height', 'min-height', '160px'],
    ])('%s: sets %s to %s', async (id, property, expected) => {
      const { root } = mount(id);
      const style = box(root).element().getAttribute('style') ?? '';
      expect(style).toContain(`${property}: ${expected}`);
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-48/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });

    test('styles override the textarea classes', async () => {
      const { root } = mount('styles');
      await expect.element(box(root)).toHaveClass(/textarea-primary/);
    });
  });

  describe('direction', () => {
    test('defaults to ltr', async () => {
      const { root } = mount('default');
      await expect.element(box(root)).toHaveAttribute('dir', 'ltr');
    });

    test('direction: rtl', async () => {
      const { root } = mount('direction-rtl');
      await expect.element(box(root)).toHaveAttribute('dir', 'rtl');
    });

    test('directionField follows the other field', async () => {
      const { root } = mount('direction-field');
      const textarea = box(root);

      await expect.element(textarea).toHaveAttribute('dir', 'ltr');
      await box(root, 'Language').fill('rtl');
      await expect.element(textarea).toHaveAttribute('dir', 'rtl');
      await box(root, 'Language').fill('ltr');
      await expect.element(textarea).toHaveAttribute('dir', 'ltr');
    });

    test('directionField pointing at a missing nested path falls back to ltr', async () => {
      const { root } = mount('direction-field-missing');
      await expect.element(box(root)).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('validation', () => {
    test('required: * marker, error when cleared, gone when refilled', async () => {
      const { root } = mount('required');

      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await box(root).clear();
      await blur();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await box(root).fill('again');
      await blur();
      await expect.element(root.getByText('This field is required')).not.toBeInTheDocument();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await box(root).clear();
      await blur();
      await expect.element(root.getByText('Please write something')).toBeVisible();
    });

    test('maxLength', async () => {
      const { root } = mount('max-length');
      await box(root).fill('more than ten characters');
      await blur();
      await expect.element(root.getByText('Must be at most 10 characters')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly renders the value as text, without a textarea', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText('Form read only')).toBeVisible();
      await expect.element(root.getByRole('textbox')).not.toBeInTheDocument();
    });

    test.each([
      ['readonly', 'Read only'],
      ['disabled', 'Disabled'],
    ])('%s: value shown, textarea disabled', async (id, expected) => {
      const { root } = mount(id);
      await expect.element(box(root)).toBeDisabled();
      await expect.element(box(root)).toHaveValue(expected);
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const textarea = box(root);

      await expect.element(textarea).toBeEnabled();
      await box(root, 'Lock').fill('x');
      await expect.element(textarea).toBeDisabled();
      await box(root, 'Lock').clear();
      await expect.element(textarea).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(textareaVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`textarea-${id}`);
    });

    test('required error state', async () => {
      const { root } = mount('required');
      await box(root).clear();
      await blur();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await parkPointer();
      await expect.element(root).toMatchScreenshot('textarea-required-error');
    });
  });
});
