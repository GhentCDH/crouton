/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import Btn from './btn.vue';
import { hintAria } from './hint';

describe('hintAria', () => {
  it('adds nothing when the hint repeats the name', () => {
    expect(hintAria('h', 'Delete', 'Delete')).toEqual({ trigger: {}, hint: {} });
    // Visible text with extra whitespace counts as the same name.
    expect(hintAria('h', 'Search Open Library', '\n  Search  Open Library ')).toEqual({
      trigger: {},
      hint: {},
    });
  });

  it('names an icon-only button with the hint', () => {
    expect(hintAria('h', 'Delete', '')).toEqual({
      trigger: { 'aria-labelledby': 'h' },
      hint: {},
    });
    expect(hintAria('h', 'Delete', undefined).trigger).toEqual({ 'aria-labelledby': 'h' });
  });

  it('describes a button whose name differs from the hint', () => {
    expect(hintAria('h', 'Opens the record', 'View')).toEqual({
      trigger: { 'aria-describedby': 'h' },
      hint: { role: 'tooltip' },
    });
  });
});

describe('Btn without native hint support', () => {
  it('keeps the CSS tooltip and passes attributes to the button', () => {
    const wrapper = mount(Btn, {
      props: { tooltip: 'Remove filter' },
      attrs: { 'aria-label': 'Remove filter', class: 'extra' },
    });
    const button = wrapper.find('button');

    expect(button.attributes('data-tip')).toBe('Remove filter');
    expect(button.classes()).toContain('tooltip');
    expect(button.classes()).toContain('extra');
    expect(button.attributes('aria-label')).toBe('Remove filter');
    expect(button.attributes('interestfor')).toBeUndefined();
    expect(wrapper.find('[popover]').exists()).toBe(false);
  });
});
