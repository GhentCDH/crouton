<template>
  <ReadonlyLabel :label="label" class="h-full">
    <div class="flex flex-gap-2 items-center">
      <Autocomplete
        v-if="fetchOptions"
        :model-value="value"
        :hide-label="true"
        :hide-errors="true"
        :clearable="true"
        :fetch-options="fetchOptions.fetchOptions"
        :label-key="options.labelKey"
        :value-key="options.valueKey"
        :enable-create="fetchOptions.enableCreate"
        @change="onChange"
        @blur="onBlur"
        @clear="onClear"
        @create="onCreate"
      />
    </div>
  </ReadonlyLabel>
</template>
<script setup lang="ts">
import { JsonFormModalService, ReadonlyLabel, useFetchOptions, useHttpClient } from '@ghentcdh/crouton-forms-vue';
import { Autocomplete } from '@ghentcdh/ui';
import { computedAsync } from '../utils/computedAsync';
import { RelationAutocompleteProperties } from './RelationAutocomplete.properties';

const props = defineProps(RelationAutocompleteProperties);
const emit = defineEmits<{
  (e: 'change', value: unknown): void;
}>();

const http = useHttpClient();

const fetchOptions = computedAsync(() => {
  const resource = props.options.autocompleteResource ?? props.options.resource;
  return useFetchOptions(
    {
      resource,
    },
    http,
    {},
  );
});

const extractValue = (selected: unknown): unknown => {
  if (!selected || typeof selected !== 'object') return selected;
  const vk = props.valueKey;
  if (vk && vk in (selected as Record<string, unknown>)) {
    return (selected as Record<string, unknown>)[vk];
  }
  return selected;
};

const onChange = (selected: unknown) => {
  emit('change', extractValue(selected));
};

const onBlur = () => {
  // no-op — value already committed via onChange
};

const onClear = () => {
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
          emit('change', extractValue(res));
        });
      },
    });
  }
};
</script>
