import { page } from 'vitest/browser';
import { render } from 'vitest-browser-vue';
import { defineComponent, h, ref } from 'vue';

import '@ghentcdh/crouton-ui-vue';

import { type UniqueCheckFn, provideUniqueCheck } from '../../../../composables/useUniqueValidator';
import type { HttpClient } from '../../../../http-client';
import FormComponent from '../../../FormComponent.vue';
import type { ControlVariant } from './control-variant';

/**
 * Mount one variant inside the real form (vee-validate context, renderers,
 * error mode) in the browser. `values()` returns the last `change` payload.
 */
export const mountControl = (
  variant: ControlVariant,
  { uniqueCheck, http }: { uniqueCheck?: UniqueCheckFn; http?: HttpClient } = {},
) => {
  const last = ref<Record<string, unknown> | undefined>(variant.formData);
  const events: Record<string, unknown>[] = [];

  const Host = defineComponent({
    setup: () => {
      if (uniqueCheck) provideUniqueCheck(uniqueCheck);
      return () => [
        // Outside the screenshot area: visual tests park the pointer here so
        // hover styles from a previous interaction don't leak into snapshots.
        h('div', { 'data-testid': 'pointer-park', style: 'height: 8px' }),
        h('div', { 'data-testid': `variant-${variant.id}`, style: 'padding: 8px' }, [
          h(FormComponent, {
            id: `form-${variant.id}`,
            schema: variant.schema,
            uiSchema: variant.uiSchema,
            formData: variant.formData,
            http,
            ...variant.form,
            onChange: (data: Record<string, unknown>) => {
              last.value = data;
            },
            onEvents: (event: Record<string, unknown>) => {
              events.push(event);
            },
          }),
        ]),
      ];
    },
  });

  render(Host);
  return {
    root: page.getByTestId(`variant-${variant.id}`),
    values: () => last.value,
    /** Form events a control dispatched (e.g. autocomplete `create`). */
    events: () => events,
  };
};
