<template>
  <form :id="id" @submit.prevent="onSubmit">
    <Dispatch :uischema="uiSchema" :schema="schema" />
  </form>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate';
import {
  computed,
  nextTick,
  onMounted,
  provide,
  ref,
  toRaw,
  toRef,
  watch,
} from 'vue';
import { fromJSONSchema, type ZodType } from 'zod';

import { enforceRequiredStringMinLength } from '@ghentcdh/crouton-core';
import { myStyles } from '@ghentcdh/ui';

import Dispatch from './Dispatch.vue';
import type { Data, SubmitFormEvent } from './FormComponent.properties';
import {
  JsonFormComponentEmits,
  JsonFormComponentProperties,
} from './FormComponent.properties';
import { registerZodErrorMap } from './errorMessages';
import {
  ERROR_MODE_KEY,
  FORM_READONLY_KEY,
  FORM_SUBMITTED_KEY,
} from './errorMode';
import { customRenderers } from './renderers';
import type { FormEventPayload } from '../composables/useFormEvents';
import { provideFormEvents } from '../composables/useFormEvents';
import { provideHttpClient } from '../composables/useHttpClient';

registerZodErrorMap();

const properties = defineProps(JsonFormComponentProperties);
const emits = defineEmits(JsonFormComponentEmits);

/**
 * Wrap a Zod schema as a vee-validate TypedSchema.
 *
 * vee-validate v4 identifies typed schemas by `__type === 'VVTypedSchema'`.
 * Without this wrapper, vee-validate falls back to `validateObjectSchema`
 * which calls `Object.keys()` on the raw Zod instance — iterating Zod
 * internals instead of form fields — so validation silently always passes.
 *
 * The `parse()` contract: return `{ value, errors: [] }` on success, or
 * `{ errors: [{ path, errors: string[] }] }` on failure.
 */
function toVeeValidateTypedSchema(schema: ZodType) {
  return {
    __type: 'VVTypedSchema' as const,
    parse(values: unknown) {
      const result = schema.safeParse(values);
      if (result.success) {
        return Promise.resolve({ value: result.data, errors: [] });
      }
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        errors: [issue.message],
      }));
      return Promise.resolve({ value: undefined, errors });
    },
  };
}

const zodSchema = computed(() => {
  if (!properties.schema) return undefined;
  try {
    const patched = enforceRequiredStringMinLength(properties.schema);
    return toVeeValidateTypedSchema(fromJSONSchema(patched as any));
  } catch {
    return undefined;
  }
});

const { values, errors, meta, setValues, validate, setFieldTouched } = useForm({
  validationSchema: zodSchema as any,
  initialValues: properties.formData as Record<string, unknown>,
});

// Merge base renderers with any extras passed via prop.
// Extras come last so higher-ranked testers override the defaults.
provide(
  'renderers',
  properties.renderers?.length
    ? [...customRenderers, ...properties.renderers]
    : customRenderers,
);
provide('readonlyRenderers', properties.renderers ?? []);
provide('rootSchema', properties.schema);
provide('styles', myStyles);

const submitted = ref(false);
provide(ERROR_MODE_KEY, toRef(properties, 'errorMode'));
provide(FORM_SUBMITTED_KEY, submitted);
provide(FORM_READONLY_KEY, toRef(properties, 'readonly'));

// Validate on mount to emit accurate initial validity state.
// When the initial data is already invalid (e.g. a pre-existing empty required
// field loaded from the server), mark those fields as touched so the error is
// visible immediately — the user needs to know what to fix before saving.
onMounted(async () => {
  const result = await validate();
  if (!result.valid) {
    for (const field of Object.keys(result.errors)) {
      setFieldTouched(field, true);
    }
  }
  emits('valid', result.valid);
});

provideFormEvents((payload: FormEventPayload) => {
  emits('events', payload);
});

if (properties.http) {
  provideHttpClient(properties.http);
}

// Prevents the values watcher from emitting 'change' during programmatic
// setValues calls, which would feed back into the formData prop and create
// an infinite update cycle.
let syncing = false;

// Sync external formData changes into vee-validate.
// Shallow watch (no `deep: true`) is intentional: vee-validate stores references
// to nested objects from the data passed to setValues, so a deep watcher would
// re-fire whenever vee-validate mutates those shared nested references internally
// — causing "Maximum recursive updates" on the second (and subsequent) refreshes.
// We only need to react when a wholly new formData object is assigned.
watch(
  () => properties.formData,
  () => {
    const newData = toRaw(properties.formData);
    if (!newData) return;
    if (JSON.stringify(newData) === JSON.stringify(toRaw(values))) return;
    syncing = true;
    setValues(newData as Record<string, unknown>);
    nextTick(() => {
      syncing = false;
    });
  },
);

// Emit changes when vee-validate values change
watch(
  values,
  (newValues) => {
    if (syncing) return;
    const isValid = meta.value.valid;
    emits('valid', isValid);
    emits('change', toRaw(newValues) as Data);
  },
  { deep: true },
);

// Emit errors when they change
watch(
  errors,
  (newErrors) => {
    const errorList = Object.entries(newErrors)
      .filter(([, msg]) => !!msg)
      .map(([path, message]) => ({ path, message }));
    emits('errors', errorList);
  },
  { deep: true },
);

const onSubmit = () => {
  submitted.value = true;
  emits('submit', {
    data: toRaw(values) as Data,
    valid: meta.value.valid,
  } as SubmitFormEvent);
};

const markSubmitted = () => {
  submitted.value = true;
};

/** Returns a plain-object snapshot of the current vee-validate values. */
const getCurrentValues = (): Data => toRaw(values) as Data;

defineExpose({ markSubmitted, getCurrentValues });
</script>
