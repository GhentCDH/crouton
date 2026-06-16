<template>
  <SelectComponent
    v-bind="wrapper"
    :model-value="value"
    :options="selectOptions"
    :clearable="(appliedOptions as any).clearable ?? true"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, ref, watch } from 'vue';

import type { AutocompleteAllOptions } from '@ghentcdh/crouton-core';
import { SelectComponent } from '@ghentcdh/ui';

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

const valueKey = computed(
  () => (appliedOptions.value as any).valueKey ?? 'value',
);
const isRemote = computed(
  () =>
    !!(appliedOptions.value as any).uri ||
    !!(appliedOptions.value as any).resource,
);

// Remote options fetched from URI or resource.
const remoteOptions = ref<any[]>([]);

watch(
  [appliedOptions, formValues],
  async ([opts]) => {
    if (!isRemote.value) return;
    const fetcher = await useFetchOptions(
      opts as AutocompleteAllOptions,
      http,
      formValues,
    );
    if (!fetcher.fetchOptions) return;
    try {
      const results = await fetcher.fetchOptions(
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

const selectOptions = computed(() => {
  if (isRemote.value) return remoteOptions.value;
  const opts = appliedOptions.value as any;
  return opts.options ?? opts.values ?? [];
});

const onChange = (val: any) => {
  const opts = appliedOptions.value as any;
  const stored =
    opts.storeValue && val && typeof val === 'object'
      ? val[valueKey.value]
      : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
