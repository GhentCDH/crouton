/**
 * @vitest-environment happy-dom
 *
 * Built-in tabs layout (#629): one tab per child, single form, error badge per tab.
 */
import { mount } from '@vue/test-utils';
import { useForm } from 'vee-validate';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, provide } from 'vue';

import TabsLayout from './TabsLayout.vue';

const elements = [
  { type: 'GroupLayout', options: { title: 'General' }, elements: [{ type: 'Control', scope: '#/properties/title' }] },
  { type: 'GroupLayout', options: { titleKey: 'name' }, elements: [{ type: 'Control', scope: '#/properties/isbn' }] },
];

const mountTabs = async (errors: Record<string, string> = {}) => {
  const wrapper = mount(
    defineComponent({
      setup: () => {
        const form = useForm({ initialValues: {} });
        form.setErrors(errors);
        provide('renderers', [{ tester: () => 1, renderer: defineComponent({ setup: () => () => h('i') }) }]);
        provide('rootSchema', {});
        return () => h(TabsLayout, { elements, schema: {}, data: { name: 'Loans' } } as never);
      },
    }),
  );
  await nextTick();
  return wrapper;
};

describe('TabsLayout', () => {
  it('renders a tab per element, titles from title / titleKey', async () => {
    const tabs = (await mountTabs()).findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(['General', 'Loans']);
  });

  it('shows only the active panel but keeps all mounted', async () => {
    const wrapper = await mountTabs();
    const panels = wrapper.findAll('[role="tabpanel"]');
    expect(panels).toHaveLength(2);
    const hidden = () => panels.map((p) => (p.attributes('style') ?? '').includes('display: none'));
    expect(hidden()).toEqual([false, true]);
    await wrapper.findAll('[role="tab"]')[1]?.trigger('click');
    expect(hidden()).toEqual([true, false]);
  });

  it('arrow keys move between tabs', async () => {
    const wrapper = await mountTabs();
    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.findAll('[role="tab"]')[1]?.attributes('aria-selected')).toBe('true');
    await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.findAll('[role="tab"]')[0]?.attributes('aria-selected')).toBe('true');
  });

  it('marks the tab that holds an invalid field', async () => {
    const tabs = (await mountTabs({ isbn: 'Required' })).findAll('[role="tab"]');
    expect(tabs[0]?.find('.badge').exists()).toBe(false);
    expect(tabs[1]?.find('.badge').exists()).toBe(true);
  });
});
