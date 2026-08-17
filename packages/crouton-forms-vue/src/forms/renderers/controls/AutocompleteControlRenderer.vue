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

// `formValues` is the reactive form state object; the fetch closures read it at
// call time, so this only needs to re-run when the control options change.
watch(
  appliedOptions,
  async (opts) => {
    fetchOptions.value = await useFetchOptions(opts as AutocompleteAllOptions, http, formValues);
  },
  { immediate: true, deep: true },
);

/**
 * What the Autocomplete renders. The underlying component labels an object via
 * `labelKey` but prints a primitive verbatim, so a field storing only a scalar
 * (`storeValue: true`) would show a raw id when an existing record is edited.
 * We resolve that scalar back to its record here; the stored form value stays
 * untouched.
 */
const displayValue = ref<unknown>(value.value);

const hydrateDisplayValue = async (val: unknown) => {
  const config = fetchOptions.value;

  // Nothing to resolve: empty, or the full object is already stored.
  if (val === null || val === undefined || val === '' || typeof val === 'object') {
    displayValue.value = val;
    return;
  }

  const labelKey = config?.labelKey as string | undefined;
  const valueKey = config?.valueKey as string | undefined;
  if (!config?.fetchByValue || !labelKey || labelKey === valueKey) {
    displayValue.value = val;
    return;
  }

  const cached = config.peekByValue?.(val);
  if (cached !== undefined) {
    displayValue.value = cached ?? val;
    return;
  }

  // Keep what is on screen while resolving, unless it shows something else.
  const current = displayValue.value as Record<string, unknown> | null;
  const showsSameValue =
    !!current && typeof current === 'object' && !!valueKey && current[valueKey] === val;
  if (!showsSameValue) displayValue.value = val;

  const record = await config.fetchByValue(val);
  // The value changed while the request was in flight – drop the stale result.
  if (value.value !== val) return;
  displayValue.value = record ?? val;
};

watch([value, fetchOptions], ([val]) => hydrateDisplayValue(val), {
  immediate: true,
});

const onChange = (val: any) => {
  setValue(val);
  onFieldChange();
};

const formEvents = useFormEvents();
const path = scopeToPath(props.uischema.scope);

const setValue = (result: Record<string, unknown>) => {
  if (!result || !fetchOptions.value) {
    displayValue.value = result;
    field.setValue(result);
    return;
  }

  const { valueKey, labelKey } = fetchOptions.value;
  const opts = appliedOptions.value as any;

  // storeValue: true → store only the primitive value (e.g. an id string)
  if (opts.storeValue && valueKey && valueKey in result) {
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

  const stripped = Object.fromEntries(keys.filter((k) => k in result).map((k) => [k, result[k]]));
  displayValue.value = stripped;
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
