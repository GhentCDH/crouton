<template>
  <Autocomplete
    :label="label"
    v-if="fetchOptions"
    :model-value="displayValue"
    :clearable="true"
    :fetch-options="fetchOptions.fetchOptions"
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
  JsonFormModalService,
  useFetchOptions,
  useHttpClient,
} from '@ghentcdh/crouton-forms-vue';
import { Autocomplete } from '@ghentcdh/ui';
import { computed, ref, watch } from 'vue';
import { computedAsync } from '../utils/computedAsync';
import { RelationAutocompleteProperties } from './RelationAutocomplete.properties';

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
const displayValue = ref<any>(props.value);

const hydrateDisplayValue = async (val: unknown) => {
  const config = fetchOptions.value;

  if (val === null || val === undefined || val === '' || typeof val === 'object') {
    displayValue.value = val;
    return;
  }

  const labelKey = labelKeyName.value;
  const valueKey = valueKeyName.value;
  if (!config?.fetchByValue || !labelKey || labelKey === valueKey) {
    displayValue.value = val;
    return;
  }

  const cached = config.peekByValue?.(val);
  if (cached !== undefined) {
    displayValue.value = cached ?? val;
    return;
  }

  const current = displayValue.value as Record<string, unknown> | null;
  const showsSameValue =
    !!current && typeof current === 'object' && current[valueKey] === val;
  if (!showsSameValue) displayValue.value = val;

  const record = await config.fetchByValue(val);
  if (props.value !== val) return;
  displayValue.value = record ?? val;
};

watch(
  [() => props.value, fetchOptions],
  ([val]) => hydrateDisplayValue(val),
  { immediate: true },
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

const onCreate = () => {
  if (fetchOptions.value?.enableCreate === false) return;
  const form = fetchOptions.value!.form as any;
  if (form) {
    JsonFormModalService.openModal({
      schema: form.json_schema,
      uiSchema: form.ui_schema,
      modalTitle: `Create new ${props.label}`,
      http,
      onClose: (result) => {
        if (!result || !result.valid) return;
        form.create(result.data).then((res: any) => {
          const value = extractValue(res);
          fetchOptions.value?.rememberValue?.(value, res);
          displayValue.value = res;
          emit('change', value);
        });
      },
    });
  }
};
</script>
