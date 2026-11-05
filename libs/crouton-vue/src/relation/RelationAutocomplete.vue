<template>
  <Autocomplete
    :label="label"
    v-if="fetchOptions"
    :model-value="displayValue"
    :clearable="true"
    :fetch-options="fetchOptions.fetchOptions ?? undefined"
    :label-key="labelKeyName"
    :value-key="valueKeyName"
    :enable-create="fetchOptions.enableCreate"
    width="w-full"
    @change="onChange"
    @blur="onBlur"
    @clear="onClear"
    @create="onCreate"
  />
</template>
<script setup lang="ts">
import {
  useAutocompleteDisplayValue,
  useFetchOptions,
  useHttpClient,
} from '@ghentcdh/crouton-forms-vue';
import { Autocomplete } from '@ghentcdh/crouton-ui-vue';
import { computed } from 'vue';
import { computedAsync } from '../utils/computedAsync';
import { RelationAutocompleteProperties } from './RelationAutocomplete.properties';
import { useRelationCreate } from './useRelationCreate';

const props = defineProps(RelationAutocompleteProperties);
const emit = defineEmits<{
  (e: 'change', value: unknown): void;
}>();

const http = useHttpClient();

// The options object wins over the prop defaults, so both stay in sync.
const labelKeyName = computed(
  () => (props.options?.labelKey as string) ?? props.labelKey,
);
const valueKeyName = computed(
  () => (props.options?.valueKey as string) ?? props.valueKey,
);

const fetchOptions = computedAsync(() => {
  const resource = props.options.autocompleteResource ?? props.options.resource;
  return useFetchOptions(
    {
      resource,
      labelKey: labelKeyName.value,
      valueKey: valueKeyName.value,
    } as any,
    http,
    props.formValues ?? {},
  );
});

/**
 * The Autocomplete labels an object via `labelKey` but prints a primitive
 * verbatim, so a stored scalar would render as a raw id when editing. Resolve
 * it back to its record for display only; the emitted value stays scalar.
 */
const { displayValue } = useAutocompleteDisplayValue(
  () => props.value,
  fetchOptions,
  () => labelKeyName.value,
  () => valueKeyName.value,
);

const extractValue = (selected: unknown): unknown => {
  if (!selected || typeof selected !== 'object') return selected;
  const vk = valueKeyName.value;
  if (vk && vk in (selected as Record<string, unknown>)) {
    return (selected as Record<string, unknown>)[vk];
  }
  return selected;
};

const onChange = (selected: unknown) => {
  const value = extractValue(selected);
  if (selected && typeof selected === 'object') {
    fetchOptions.value?.rememberValue?.(value, selected);
    displayValue.value = selected;
  } else {
    displayValue.value = selected;
  }
  emit('change', value);
};

const onBlur = () => {
  // no-op — value already committed via onChange
};

const onClear = () => {
  displayValue.value = null;
  emit('change', null);
};

const { onCreate } = useRelationCreate({
  fetchOptions,
  http,
  label: () => props.label,
  onCreated: (res) => {
    const value = extractValue(res);
    fetchOptions.value?.rememberValue?.(value, res);
    displayValue.value = res;
    emit('change', value);
  },
});
</script>
