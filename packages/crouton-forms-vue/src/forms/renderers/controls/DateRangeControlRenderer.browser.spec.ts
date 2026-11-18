import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { dateRangeVariants } from './__tests__/daterange.variants';
import { mountControl } from './__tests__/mount-control';

const mount = (id: string) => {
  const variant = dateRangeVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown dateRange variant "${id}"`);
  return mountControl(variant);
};

type Root = ReturnType<typeof mount>['root'];
const from = (root: Root, name = 'From') => root.getByLabelText(name, { exact: true });
const to = (root: Root, name = 'To') => root.getByLabelText(name, { exact: true });

describe('DateRangeControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: two empty date inputs labelled From / To', async () => {
      const { root } = mount('default');
      await expect.element(from(root)).toHaveValue('');
      await expect.element(to(root)).toHaveValue('');
      await expect.element(from(root)).toHaveAttribute('type', 'date');
    });

    test('string schema stores the range as a JSON string', async () => {
      const { root, values } = mount('default');
      await from(root).fill('2024-03-01');
      await to(root).fill('2024-03-10');
      await expect.poll(values).toEqual({ value: '{"from":"2024-03-01","to":"2024-03-10"}' });
    });

    test('initial JSON string is shown in both inputs', async () => {
      const { root } = mount('initial-json-string');
      await expect.element(from(root)).toHaveValue('2024-05-01');
      await expect.element(to(root)).toHaveValue('2024-05-15');
    });

    test('object schema stores a real object', async () => {
      const { root, values } = mount('object-schema');
      await from(root).fill('2024-03-01');
      await expect.poll(values).toEqual({ value: { from: '2024-03-01' } });
    });

    test('initial object value is shown', async () => {
      const { root } = mount('initial-object');
      await expect.element(from(root)).toHaveValue('2024-06-01');
      await expect.element(to(root)).toHaveValue('2024-06-30');
    });

    test('each input limits the other (from ≤ to)', async () => {
      const { root } = mount('initial-json-string');
      await expect.element(from(root)).toHaveAttribute('max', '2024-05-15');
      await expect.element(to(root)).toHaveAttribute('min', '2024-05-01');
    });

    test('clearing both ends stores no value', async () => {
      const { root, values } = mount('initial-json-string');
      await from(root).fill('');
      await to(root).fill('');
      await expect.poll(() => values() !== undefined && values()?.['value'] === undefined).toBe(true);
    });

    test('fromField / toField choose the stored keys', async () => {
      const { root, values } = mount('custom-fields');
      await expect.element(from(root)).toHaveValue('2024-01-01');
      await to(root).fill('2024-02-28');
      await expect.poll(values).toEqual({ value: '{"start":"2024-01-01","end":"2024-02-28"}' });
    });

    test('fromLabel / toLabel name the inputs', async () => {
      const { root } = mount('custom-labels');
      await expect.element(from(root, 'Start date')).toBeVisible();
      await expect.element(to(root, 'End date')).toBeVisible();
    });
  });

  describe('yearOnly', () => {
    test('renders text inputs that accept free year values', async () => {
      const { root, values } = mount('year-only');
      await expect.element(from(root)).toHaveAttribute('type', 'text');
      await expect.element(from(root)).toHaveAttribute('placeholder', 'e.g. 450 CE');
      await from(root).fill('450 CE');
      await to(root).fill('500');
      await expect.poll(values).toEqual({ value: '{"from":"450 CE","to":"500"}' });
    });

    test('placeholder option replaces the default hint', async () => {
      const { root } = mount('year-only-placeholder');
      await expect.element(from(root)).toHaveAttribute('placeholder', 'e.g. 1200');
    });
  });

  describe('label & layout', () => {
    test('label option names the group', async () => {
      const { root } = mount('label');
      await expect.element(root.getByRole('group', { name: 'Rental period' })).toBeVisible();
    });

    test('schema title names the group', async () => {
      const { root } = mount('schema-title');
      await expect.element(root.getByRole('group', { name: 'Schema title' })).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Pick a period')).toBeVisible();
    });

    test('hideLabel hides the group label, keeps From / To', async () => {
      const { root } = mount('hide-label');
      await expect.element(from(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-96/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });

    test('styles override the input classes', async () => {
      const { root } = mount('styles');
      await expect.element(from(root)).toHaveClass(/input-primary/);
      await expect.element(to(root)).toHaveClass(/input-primary/);
    });
  });

  describe('validation', () => {
    test('required: * marker, error when both ends are cleared', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await from(root).fill('');
      await to(root).fill('');
      await userEvent.tab();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await expect.element(from(root)).toHaveAttribute('aria-invalid', 'true');
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await from(root).fill('');
      await to(root).fill('');
      await userEvent.tab();
      await expect.element(root.getByText('Please pick a period')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the range as text, without inputs', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText(/2024-05-01|1 May 2024|01\/05\/2024/)).toBeVisible();
      expect(root.element().querySelector('input')).toBeNull();
    });

    test.each(['readonly', 'disabled'])('%s: both inputs disabled, values shown', async (id) => {
      const { root } = mount(id);
      await expect.element(from(root)).toBeDisabled();
      await expect.element(to(root)).toBeDisabled();
      await expect.element(from(root)).toHaveValue('2024-05-01');
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(from(root)).toBeEnabled();
      await lock.fill('x');
      await expect.element(from(root)).toBeDisabled();
      await expect.element(to(root)).toBeDisabled();
      await lock.clear();
      await expect.element(from(root)).toBeEnabled();
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(dateRangeVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`daterange-${id}`);
    });
  });
});
