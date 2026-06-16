<template>
  <Autocomplete
    v-if="fetchOptions"
    v-bind="wrapper"
    :model-value="value"
    :fetch-options="fetchOptions.fetchOptions"
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
import { ref, watch } from 'vue';

import type { AutocompleteAllOptions } from '@ghentcdh/crouton-core';
import { Autocomplete } from '@ghentcdh/ui';

import { useFormEvents } from '../../../composables/useFormEvents';
import { useHttpClient } from '../../../composables/useHttpClient';
import { scopeToPath } from '../../scope';
import { useFetchOptions } from './composables/useFetchOption';
import { useAutocompleteBinding } from './composables/useSelectBinding';
import { JsonFormModalService } from '../../modal/FormModalService';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
} = useAutocompleteBinding(props.uischema, props.schema);

const http = useHttpClient();
const { values: formValues } = useFormContext();
const fetchOptions = ref<Awaited<ReturnType<typeof useFetchOptions>> | null>(null);

watch(
  [appliedOptions, formValues],
  async ([opts]) => {
    fetchOptions.value = await useFetchOptions(opts as AutocompleteAllOptions, http, formValues);
  },
  { immediate: true, deep: true },
);

const onChange = (val: any) => {
  setValue(val);
  onFieldChange();
};

const formEvents = useFormEvents();
const path = scopeToPath(props.uischema.scope);

const setValue = (result: Record<string, unknown>) => {
  if (!result || !fetchOptions.value) {
    field.setValue(result);
    return;
  }

  const { valueKey, labelKey } = fetchOptions.value;
  const opts = appliedOptions.value as any;

  // storeValue: true → store only the primitive value (e.g. an id string)
  if (opts.storeValue && valueKey && valueKey in result) {
    field.setValue(result[valueKey]);
    return;
  }

  const keys = [valueKey, labelKey].filter(Boolean) as string[];
  if (keys.length === 0) {
    field.setValue(result);
    return;
  }

  const stripped = Object.fromEntries(keys.filter((k) => k in result).map((k) => [k, result[k]]));
  field.setValue(stripped);
};

const onCreate = () => {
  if (fetchOptions.value?.enableCreate === false) return;
  const form = fetchOptions.value!.form as any;
  if (form) {
    JsonFormModalService.openModal({
      schema: form.json_schema,
      uiSchema: form.ui_schema,
      modalTitle: `Create new ${wrapper.value.label}`,
      http,
      onClose: (result) => {
        if (!result || !result.valid) return;
        form.create(result.data).then((res: any) => {
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
