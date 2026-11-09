<template>
  <SelectComponent
    v-bind="wrapper"
    :model-value="value"
    :options="selectOptions"
    :clearable="appliedOptions?.clearable ?? true"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, ref, watch } from 'vue';

import type { AutocompleteAllOptions } from '@ghentcdh/crouton-core';
import { SelectComponent } from '@ghentcdh/crouton-ui-vue';

import { useFetchOptions } from './composables/useFetchOption';
import { useSelectBinding } from './composables/useSelectBinding';
import { useHttpClient } from '../../../composables/useHttpClient';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
} = useSelectBinding(props.uischema, props.schema);

const http = useHttpClient();
const { values: formValues } = useFormContext();

const valueKey = computed(() => appliedOptions.value?.valueKey ?? 'value');
const isRemote = computed(
  () => !!appliedOptions.value?.uri || !!appliedOptions.value?.resource,
);

// Remote options fetched from URI or resource.
const remoteOptions = ref<unknown[]>([]);

watch(
  [appliedOptions, formValues],
  async ([opts]) => {
    if (!isRemote.value) return;
    const fetcher = await useFetchOptions(
      (opts as unknown) as AutocompleteAllOptions,
      http,
      formValues,
    );
    if (!fetcher.fetchOptions) return;
    try {
      const results: unknown = await fetcher.fetchOptions(
        '',
        new AbortController().signal,
      );
      remoteOptions.value = Array.isArray(results) ? results : [];
    } catch {
      remoteOptions.value = [];
    }
  },
  { immediate: true, deep: true },
);

const selectOptions = computed<unknown[]>(() => {
  if (isRemote.value) return remoteOptions.value;
  return appliedOptions.value?.options ?? appliedOptions.value?.values ?? [];
});

const onChange = (val: unknown) => {
  const stored =
    appliedOptions.value?.storeValue && val && typeof val === 'object'
      ? (val as Record<string, unknown>)[valueKey.value]
      : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
