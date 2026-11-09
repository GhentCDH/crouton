<template>
  <Autocomplete
    v-if="fetchOptions"
    v-bind="wrapper"
    :model-value="displayValue"
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
import { Autocomplete } from '@ghentcdh/crouton-ui-vue';

import { useAutocompleteDisplayValue } from '../../../composables/useAutocompleteDisplayValue';
import { useFormEvents } from '../../../composables/useFormEvents';
import { useHttpClient } from '../../../composables/useHttpClient';
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
} = useAutocompleteBinding(props.uischema, props.schema);

const http = useHttpClient();
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
      opts as AutocompleteAllOptions,
      http,
      formValues,
    );
  },
  { immediate: true, deep: true },
);

const { displayValue } = useAutocompleteDisplayValue(
  value,
  fetchOptions,
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
  if (!result || !fetchOptions.value) {
    displayValue.value = result;
    field.setValue(result);
    return;
  }

  const { valueKey, labelKey } = fetchOptions.value;

  // storeValue: true → store only the primitive value (e.g. an id string)
  if (appliedOptions.value?.storeValue && valueKey && valueKey in result) {
    // Remember the picked record so the label survives a reload of this form.
    fetchOptions.value.rememberValue?.(result[valueKey], result);
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
      schema: form.data,
      uiSchema: form.ui,
      modalTitle: `Create new ${(wrapper.value as { label?: string }).label}`,
      http,
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
