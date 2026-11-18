import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { dateVariants } from './__tests__/date.variants';
import { mountControl } from './__tests__/mount-control';

const mount = (id: string) => {
  const variant = dateVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown date variant "${id}"`);
  return mountControl(variant);
};

type Root = ReturnType<typeof mount>['root'];
/** `<input type="date">` has no implicit ARIA role — find it by its accessible name. */
const input = (root: Root, name = 'Value') => root.getByLabelText(name, { exact: true });
const picker = () => page.getByRole('dialog');
const day = (n: number, month = 'May 2024') =>
  picker().getByRole('gridcell', { name: `${n} ${month}`, exact: true });
const openPicker = async (root: Root, name?: string) => {
  await input(root, name).click();
  await expect.element(picker()).toBeVisible();
};

describe('DateControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: empty date input labelled from the property name', async () => {
      const { root } = mount('default');
      await expect.element(input(root)).toHaveValue('');
      await expect.element(input(root)).toHaveAttribute('type', 'date');
    });

    test('typing a date stores an ISO date', async () => {
      const { root, values } = mount('default');
      await input(root).fill('2024-03-07');
      await expect.poll(() => values()?.['value']).toBe('2024-03-07T00:00:00.000Z');
    });

    test('initial ISO value is shown as a date', async () => {
      const { root } = mount('initial-value');
      await expect.element(input(root)).toHaveValue('2024-05-15');
    });

    test('null value renders an empty input', async () => {
      const { root } = mount('null-value');
      await expect.element(input(root)).toHaveValue('');
    });
  });

  describe('time', () => {
    test('date-time schema renders a datetime-local input', async () => {
      const { root } = mount('date-time');
      await expect.element(input(root)).toHaveAttribute('type', 'datetime-local');
      await expect.element(input(root)).toHaveValue('2024-05-15T10:30');
    });

    test('picking a day keeps the time', async () => {
      const { root, values } = mount('date-time');
      await openPicker(root);
      await day(20).click();
      await expect.poll(() => values()?.['value']).toBe('2024-05-20T10:30:00.000Z');
    });

    test('withTime: true adds time to a date schema', async () => {
      const { root } = mount('with-time');
      await expect.element(input(root)).toHaveAttribute('type', 'datetime-local');
    });

    test('withTime: false removes time from a date-time schema', async () => {
      const { root } = mount('without-time');
      await expect.element(input(root)).toHaveAttribute('type', 'date');
    });

    test('format: dateTime selects the date-time picker', async () => {
      const { root } = mount('format-date-time');
      await expect.element(input(root)).toHaveAttribute('type', 'datetime-local');
    });
  });

  describe('picker', () => {
    test('opens on the selected month and picking a day stores it and closes', async () => {
      const { root, values } = mount('initial-value');
      await openPicker(root);
      await expect.element(picker().getByText('May 2024')).toBeVisible();
      await expect.element(day(15)).toHaveAttribute('aria-selected', 'true');

      await day(20).click();
      await expect.poll(() => values()?.['value']).toBe('2024-05-20T00:00:00.000Z');
      await expect.element(picker()).not.toBeInTheDocument();
    });

    test('previous / next month', async () => {
      const { root } = mount('initial-value');
      await openPicker(root);
      await picker().getByRole('button', { name: 'Next month' }).click();
      await expect.element(picker().getByText('June 2024')).toBeVisible();
      await picker().getByRole('button', { name: 'Previous month' }).click();
      await picker().getByRole('button', { name: 'Previous month' }).click();
      await expect.element(picker().getByText('April 2024')).toBeVisible();
    });

    test('Today selects the current date', async () => {
      const { root, values } = mount('default');
      await openPicker(root);
      await picker().getByRole('button', { name: 'Today' }).click();
      const today = new Date().toISOString().slice(0, 10);
      await expect.poll(() => String(values()?.['value'] ?? '')).toContain(today);
    });

    test('Clear empties the value', async () => {
      const { root, values } = mount('initial-value');
      await openPicker(root);
      await picker().getByRole('button', { name: 'Clear' }).click();
      await expect.element(input(root)).toHaveValue('');
      await expect.poll(() => values() !== undefined && values()?.['value'] === undefined).toBe(true);
    });

    test('keyboard: Tab reaches the selected day, arrows move, Enter picks', async () => {
      const { root, values } = mount('initial-value');
      await openPicker(root);
      await expect.element(day(15)).toHaveAttribute('tabindex', '0');

      day(15).element().focus();
      await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}');
      await expect.poll(() => values()?.['value']).toBe('2024-05-23T00:00:00.000Z');
    });

    test('Escape closes the picker', async () => {
      const { root } = mount('initial-value');
      await openPicker(root);
      day(15).element().focus();
      await userEvent.keyboard('{Escape}');
      await expect.element(picker()).not.toBeInTheDocument();
    });

    test('min / max: days outside the range are disabled', async () => {
      const { root } = mount('min-max');
      await expect.element(input(root)).toHaveAttribute('min', '2024-05-10');
      await expect.element(input(root)).toHaveAttribute('max', '2024-05-20');
      await openPicker(root);
      await expect.element(day(9)).toBeDisabled();
      await expect.element(day(10)).toBeEnabled();
      await expect.element(day(21)).toBeDisabled();
    });

    test('locale: month heading and weekdays are localised', async () => {
      const { root } = mount('locale');
      await openPicker(root);
      await expect.element(picker().getByText('mei 2024')).toBeVisible();
    });

    test('firstDayOfWeek: 0 starts the week on Sunday', async () => {
      const { root } = mount('first-day-sunday');
      await openPicker(root);
      const first = picker().getByRole('columnheader').first();
      await expect.element(first).toHaveAttribute('aria-label', expect.stringMatching(/^su/i));
    });

    test('default week starts on Monday', async () => {
      const { root } = mount('initial-value');
      await openPicker(root);
      const first = picker().getByRole('columnheader').first();
      await expect.element(first).toHaveAttribute('aria-label', expect.stringMatching(/^mo/i));
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
      await expect.element(root.getByText('Pick a day')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(input(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('width applies its class to the input', async () => {
      const { root } = mount('width');
      await expect.element(input(root)).toHaveClass(/w-48/);
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
    test('required: clearing shows the required error', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await input(root).fill('');
      await userEvent.tab();
      await expect.element(root.getByText('This field is required')).toBeVisible();
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await input(root).fill('');
      await userEvent.tab();
      await expect.element(root.getByText('Please pick a date')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the date without an input', async () => {
      const { root } = mount('form-readonly');
      await expect.element(root.getByText(/2024/)).toBeVisible();
      expect(root.element().querySelector('input')).toBeNull();
    });

    test.each(['readonly', 'disabled'])('%s: input disabled, picker does not open', async (id) => {
      const { root } = mount(id);
      await expect.element(input(root)).toBeDisabled();
      await expect.element(input(root)).toHaveValue('2024-05-15');
      await input(root).click({ force: true });
      await expect.element(picker()).not.toBeInTheDocument();
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

    test.each(dateVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`date-${id}`);
    });

    test('open picker', async () => {
      const { root } = mount('initial-value');
      await openPicker(root);
      await parkPointer();
      await expect.element(picker()).toMatchScreenshot('date-open-picker');
    });
  });
});
