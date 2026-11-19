import { beforeEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { cleanup } from 'vitest-browser-vue';

import { markdownVariants } from './__tests__/markdown.variants';
import { mountControl } from './__tests__/mount-control';

const mount = (id: string) => {
  const variant = markdownVariants.find((v) => v.id === id);
  if (!variant) throw new Error(`Unknown markdown variant "${id}"`);
  return mountControl(variant);
};

type Root = ReturnType<typeof mount>['root'];
/** The TipTap editing surface (loaded async) is the textbox named by the label. */
const editor = (root: Root, name = 'Value') => root.getByRole('textbox', { name, exact: true });
const toolbar = (root: Root, name: 'B' | 'I') => root.getByRole('button', { name, exact: true });

describe('MarkdownControlRenderer', () => {
  beforeEach(() => cleanup());

  describe('value', () => {
    test('default: an empty multi-line editor labelled from the property name', async () => {
      const { root } = mount('default');
      await expect.element(editor(root)).toBeVisible();
      await expect.element(editor(root)).toHaveAttribute('aria-multiline', 'true');
      await expect.element(editor(root)).toHaveTextContent('');
    });

    test('typing stores markdown', async () => {
      const { root, values } = mount('default');
      await editor(root).click();
      await userEvent.keyboard('Plain text');
      await expect.poll(values).toEqual({ value: 'Plain text' });
    });

    test('initial markdown is rendered as formatted text', async () => {
      const { root } = mount('initial-value');
      await expect.element(editor(root)).toHaveTextContent('Hello world');
      expect(editor(root).element().querySelector('strong')?.textContent).toBe('world');
    });

    test('Bold toolbar button wraps new text in **', async () => {
      const { root, values } = mount('default');
      await editor(root).click();
      await toolbar(root, 'B').click();
      await userEvent.keyboard('strong');
      await expect.poll(values).toEqual({ value: '**strong**' });
    });

    test('Italic keyboard shortcut wraps new text in *', async () => {
      const { root, values } = mount('default');
      await editor(root).click();
      await userEvent.keyboard('{ControlOrMeta>}i{/ControlOrMeta}soft');
      await expect.poll(values).toEqual({ value: '*soft*' });
    });

    test('null value renders an empty editor', async () => {
      const { root } = mount('null-value');
      await expect.element(editor(root)).toHaveTextContent('');
    });
  });

  describe('size & layout', () => {
    test('minHeight (CSS length) sets the editor min-height', async () => {
      const { root } = mount('min-height');
      await expect.element(editor(root)).toBeVisible();
      const card = root.element().querySelector<HTMLElement>('.card');
      expect(card?.style.minHeight).toBe('240px');
    });

    test('width applies its class to the field', async () => {
      const { root } = mount('width');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-96/);
    });

    test('colspan makes the field full width', async () => {
      const { root } = mount('colspan');
      await expect.element(root.getByRole('group', { name: 'Value' })).toHaveClass(/w-full/);
    });
  });

  describe('label & help', () => {
    test('label option is the accessible name', async () => {
      const { root } = mount('label');
      await expect.element(editor(root, 'Custom label')).toBeVisible();
    });

    test('schema title is used as label', async () => {
      const { root } = mount('schema-title');
      await expect.element(editor(root, 'Schema title')).toBeVisible();
    });

    test('schema description is shown', async () => {
      const { root } = mount('description');
      await expect.element(root.getByText('Supports **bold** and _italic_')).toBeVisible();
    });

    test('hideLabel hides the visible label but keeps the accessible name', async () => {
      const { root } = mount('hide-label');
      await expect.element(editor(root)).toBeVisible();
      await expect.element(root.getByText('Value', { exact: true })).not.toBeInTheDocument();
    });

    test('the wrapper is not a textbox — only the editing surface is', async () => {
      const { root } = mount('default');
      await expect.element(editor(root)).toBeVisible();
      expect(root.element().querySelectorAll('[role="textbox"]')).toHaveLength(1);
    });
  });

  describe('validation', () => {
    test('required: clearing shows the error and marks the editor invalid', async () => {
      const { root } = mount('required');
      await expect.element(root.getByRole('group', { name: 'Value*' })).toBeVisible();
      await editor(root).click();
      await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}{Backspace}');
      await userEvent.tab();
      await expect.element(root.getByText('This field is required')).toBeVisible();
      await expect.element(editor(root)).toHaveAttribute('aria-invalid', 'true');
    });

    test('errorMessage replaces the default message', async () => {
      const { root } = mount('error-message');
      await editor(root).click();
      await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}{Backspace}');
      await userEvent.tab();
      await expect.element(root.getByText('Please write something')).toBeVisible();
    });
  });

  describe('enabled state', () => {
    test('form-level readonly shows the markdown source as escaped text, without an editor', async () => {
      const { root } = mount('form-readonly');
      // By design MarkdownValue renders plain text (no v-html), so nothing is injected.
      await expect.element(root.getByText('**Bold** text')).toBeVisible();
      expect(root.element().querySelector('strong')).toBeNull();
      expect(root.element().querySelector('[contenteditable]')).toBeNull();
    });

    test.each([
      ['readonly', 'Read only'],
      ['disabled', 'Disabled'],
    ])('%s: editor not editable, toolbar disabled', async (id, text) => {
      const { root, values } = mount(id);
      await expect.element(editor(root)).toHaveTextContent(text);
      await expect.element(editor(root)).toHaveAttribute('contenteditable', 'false');
      await expect.element(toolbar(root, 'B')).toBeDisabled();
      await editor(root).click({ force: true });
      await userEvent.keyboard('x');
      expect(values()).toEqual({ value: text });
    });

    test('disabledWhen follows the other field', async () => {
      const { root } = mount('disabled-when');
      const lock = root.getByRole('textbox', { name: 'Lock' });

      await expect.element(editor(root)).toHaveAttribute('contenteditable', 'true');
      await lock.fill('x');
      await expect.element(editor(root)).toHaveAttribute('contenteditable', 'false');
      await lock.clear();
      await expect.element(editor(root)).toHaveAttribute('contenteditable', 'true');
    });
  });

  describe('visual', () => {
    const parkPointer = () => userEvent.hover(page.getByTestId('pointer-park'));

    test.each(markdownVariants.map((v) => v.id))('%s', async (id) => {
      const { root } = mount(id);
      if (id !== 'form-readonly') await expect.element(root.getByRole('textbox').last()).toBeVisible();
      await parkPointer();
      await expect.element(root).toMatchScreenshot(`markdown-${id}`);
    });
  });
});
