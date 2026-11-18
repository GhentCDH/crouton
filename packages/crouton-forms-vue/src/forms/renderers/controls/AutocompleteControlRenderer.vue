<template>
  <Autocomplete
    v-if="fetchOptions"
    v-bind="wrapper"
    :model-value="(displayValue as string | Record<string, unknown> | undefined)"
    :options="inlineOptions"
    :fetch-options="fetchOptions?.fetchOptions ?? undefined"
    :label-key="fetchOptions.labelKey"
    :value-key="fetchOptions.valueKey"
    :enable-create="fetchOptions.enableCreate"
    @change="onChange"
    @blur="onBlur"
    @create="onCreate"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, ref, watch } from 'vue';

import { Autocomplete } from '@ghentcdh/crouton-ui-vue';

import { useAutocompleteDisplayValue } from '../../../composables/useAutocompleteDisplayValue';
import { useFormEvents } from '../../../composables/useFormEvents';
import { requireHttpClient, useOptionalHttpClient } from '../../../composables/useHttpClient';
import { useModalOpener } from '../../../composables/useModalOpener';
import { scopeToPath } from '../../scope';
import { useFetchOptions } from './composables/useFetchOption';
import { useAutocompleteBinding } from './composables/useSelectBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
  emptyValue,
} = useAutocompleteBinding(props.uischema, props.schema);

const http = useOptionalHttpClient();
const { values: formValues } = useFormContext();
const fetchOptions = ref<Awaited<ReturnType<typeof useFetchOptions>> | null>(
  null,
);

// `formValues` is the reactive form state object; the fetch closures read it at
// call time, so this only needs to re-run when the control options change.
watch(
  appliedOptions,
  async (opts) => {
    fetchOptions.value = await useFetchOptions(
      opts,
      http,
      formValues,
    );
  },
  { immediate: true, deep: true },
);

// Inline list: `options`, or the deprecated `values` alias.
const inlineOptions = computed(() => {
  const opts = appliedOptions.value as { options?: unknown[]; values?: unknown[] } | undefined;
  return opts?.options ?? opts?.values;
});

// A scalar stored from an inline list (storeValue) resolves to its record
// locally; remote/resource lists resolve through fetchByValue.
// Records picked or created that are not in the inline list (e.g. via `create`).
const rememberedInline = new Map<unknown, unknown>();
const inlineConfig = computed(() => {
  const list = inlineOptions.value;
  if (!list || !fetchOptions.value) return fetchOptions.value;
  const valueKey = (fetchOptions.value.valueKey as string | undefined) ?? 'value';
  const find = (v: unknown) =>
    rememberedInline.get(v) ??
    list.find((o) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[valueKey] : o) === v) ??
    null;
  return {
    ...fetchOptions.value,
    fetchByValue: (v: unknown) => Promise.resolve(find(v)),
    peekByValue: find,
    rememberValue: (v: unknown, record: unknown) => rememberedInline.set(v, record),
  };
});

const { displayValue } = useAutocompleteDisplayValue(
  value,
  inlineConfig,
  () => fetchOptions.value?.labelKey as string | undefined,
  () => fetchOptions.value?.valueKey as string | undefined,
);

const onChange = (val: unknown) => {
  setValue(val as Record<string, unknown>);
  onFieldChange();
};

const formEvents = useFormEvents();
const modalOpener = useModalOpener();
const path = scopeToPath(props.uischema.scope);

const setValue = (result: Record<string, unknown>) => {
  // Cleared: store the form's empty value (null in API-backed forms).
  if (result === undefined || result === null || (result as unknown) === '') {
    displayValue.value = undefined;
    field.setValue(emptyValue());
    return;
  }
  // A free-text string (freeText): store as-is.
  if (typeof result !== 'object' || !fetchOptions.value) {
    displayValue.value = result;
    field.setValue(result);
    return;
  }

  const { valueKey, labelKey } = fetchOptions.value;

  // storeValue: true → store only the primitive value (e.g. an id string)
  if ((appliedOptions.value as unknown as Record<string, unknown>)?.storeValue && valueKey && valueKey in result) {
    // Remember the picked record so the label survives a reload of this form.
    inlineConfig.value?.rememberValue?.(result[valueKey], result);
    displayValue.value = result;
    field.setValue(result[valueKey]);
    return;
  }

  const keys = [valueKey, labelKey].filter(Boolean) as string[];
  if (keys.length === 0) {
    displayValue.value = result;
    field.setValue(result);
    return;
  }

  const stripped = Object.fromEntries(
    keys.filter((k) => k in result).map((k) => [k, result[k]]),
  );
  displayValue.value = stripped;
  field.setValue(stripped);
};

const onCreate = () => {
  if (fetchOptions.value?.enableCreate === false) return;
  type FormRef = { data: unknown; ui: unknown; create: (d: unknown) => Promise<Record<string, unknown>> };
  const form = fetchOptions.value?.form as FormRef | undefined;
  if (form && modalOpener) {
    modalOpener({
      schema: form.data as Record<string, unknown>,
      uiSchema: form.ui as Record<string, unknown>,
      modalTitle: `Create new ${(wrapper.value as { label?: string }).label}`,
      http: requireHttpClient(http),
      onClose: (result) => {
        if (!result || !result.valid) return;
        void form.create(result.data).then((res) => {
          setValue(res);
        });
      },
    });
    return;
  }

  formEvents.dispatch({
    event: 'create',
    type: path,
    data: value.value,
    onSuccess: setValue,
  });
};
</script>
