/**
 * @vitest-environment happy-dom
 *
 * Layout `{ "component": ... }` items must receive the current record,
 * readonly state and their static `props` (#545).
 */
import { mount } from '@vue/test-utils';
import { useForm } from 'vee-validate';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, provide, ref } from 'vue';

import { FORM_READONLY_KEY } from '@ghentcdh/crouton-forms-vue';

const received: Array<Record<string, unknown>> = [];
const RecordSummary = defineComponent({
  props: ['data', 'readonly', 'title'],
  setup: (props) => {
    received.push(props as Record<string, unknown>);
    return () => h('div', `${(props.data as { name?: string })?.name} – ${String(props.title)}`);
  },
});

const Tabs = defineComponent({
  props: ['elements', 'data'],
  setup: (props) => () =>
    h('nav', (props.elements as Array<{ options: { title: string } }>).map((e) => e.options.title).join('|')),
});

vi.mock('../composables/useCrouton', () => ({
  useCrouton: () => ({
    customComponents: [
      { tester: (el: string) => (el === 'RecordSummary' ? 1 : -1), renderer: RecordSummary },
      { tester: (el: string) => (el === 'Tabs' ? 1 : -1), renderer: Tabs },
    ],
  }),
}));

import ComponentLayoutRenderer from './ComponentLayoutRenderer.vue';

const mountInForm = (readonly: boolean) =>
  mount(
    defineComponent({
      setup: () => {
        useForm({ initialValues: { id: 7, name: 'Smith family' } });
        provide(FORM_READONLY_KEY, ref(readonly));
        return () =>
          h(ComponentLayoutRenderer, {
            uischema: { type: 'ComponentElement', options: { component: 'RecordSummary', props: { title: 'Summary' } } },
            schema: {},
          } as never);
      },
    }),
  );

describe('ComponentLayoutRenderer', () => {
  it('passes the current record, readonly and static props', () => {
    received.length = 0;
    const wrapper = mountInForm(true);

    expect(wrapper.text()).toContain('Smith family – Summary');
    expect(received[0]?.['data']).toMatchObject({ id: 7, name: 'Smith family' });
    expect(received[0]?.['readonly']).toBe(true);
  });
});

const groups = [
  { type: 'GroupLayout', options: { title: 'General' }, elements: [] },
  { type: 'GroupLayout', options: { title: 'Loans' }, elements: [] },
];

const mountCustom = (component: string) =>
  mount(
    defineComponent({
      setup: () => {
        useForm({ initialValues: {} });
        provide('renderers', [{ tester: () => 1, renderer: defineComponent({ props: ['uischema'], setup: (p) => () => h('i', (p.uischema as { options: { title: string } }).options.title) }) }]);
        provide('rootSchema', {});
        return () =>
          h(ComponentLayoutRenderer, {
            uischema: { type: 'CustomLayout', options: { component }, elements: groups },
            schema: {},
          } as never);
      },
    }),
  );

describe('ComponentLayoutRenderer — custom layout', () => {
  it('passes child elements to the registered layout component', () => {
    expect(mountCustom('Tabs').find('nav').text()).toBe('General|Loans');
  });

  it('falls back to rendering the children when the component is not registered', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(mountCustom('Missing').findAll('i').map((w) => w.text())).toEqual(['General', 'Loans']);
  });
});
