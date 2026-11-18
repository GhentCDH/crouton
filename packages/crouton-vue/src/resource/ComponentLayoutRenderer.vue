<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, inject, ref } from 'vue';

import { FORM_READONLY_KEY } from '@ghentcdh/crouton-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

const props = defineProps<{ uischema: UISchemaElement; schema: JsonSchema }>();

const options = computed(
  () => ((props.uischema as unknown as Record<string, unknown>).options ?? {}) as Record<string, unknown>,
);

const component = computed(() =>
  findCustomComponent(useCrouton().customComponents, options.value['component'] as string | undefined),
);

// Layout component items get the record being shown/edited (#545), plus the
// item's static `props` from resource.json.
const form = useFormContext();
const data = computed(() => form?.values ?? {});
const readonly = inject(FORM_READONLY_KEY, ref(false));
const staticProps = computed(() => (options.value['props'] ?? {}) as Record<string, unknown>);
</script>

<template>
  <component
    :is="component"
    v-if="component"
    v-bind="staticProps"
    :data="data"
    :readonly="readonly"
    :schema="schema"
    :uischema="uischema"
  />
</template>
