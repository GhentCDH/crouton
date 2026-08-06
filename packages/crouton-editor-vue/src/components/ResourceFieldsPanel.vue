<script setup lang="ts">
import type { ResourceJsonInput } from '@ghentcdh/crouton-core';
import type { HttpClient } from '@ghentcdh/crouton-forms-vue';
import { FormComponent } from '@ghentcdh/crouton-forms-vue';

import { ResourceFieldsPanelProperties } from './ResourceFieldsPanel.properties';
import {
  buildResourceSettingsSchema,
  buildResourceSettingsUiSchema,
} from '../schema/resource-settings.schema';

const props = defineProps(ResourceFieldsPanelProperties);

const emits = defineEmits<{
  'update:modelValue': [value: ResourceJsonInput];
}>();

const schema = buildResourceSettingsSchema();
const uiSchema = buildResourceSettingsUiSchema();

// Noop HTTP client — select renderers require one at setup even for static options.
const noop = () => Promise.resolve({ data: null as any });
const noopHttp: HttpClient = { get: noop, post: noop, patch: noop, delete: noop };

const onChange = (data: Record<string, unknown>) => {
  // Merge changed settings back with original (preserves columns, actions, etc.)
  emits('update:modelValue', { ...props.modelValue, ...data } as ResourceJsonInput);
};
</script>

<template>
  <FormComponent
    id="resource-settings"
    :schema="schema"
    :ui-schema="uiSchema"
    :form-data="modelValue"
    :http="noopHttp"
    error-mode="onChange"
    @change="onChange"
  />
</template>
