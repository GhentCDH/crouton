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

vi.mock('../composables/useCrouton', () => ({
  useCrouton: () => ({ customComponents: [{ tester: (el: string) => (el === 'RecordSummary' ? 1 : -1), renderer: RecordSummary }] }),
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
