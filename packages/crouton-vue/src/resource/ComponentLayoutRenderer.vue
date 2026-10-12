<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { computed } from 'vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

const props = defineProps<{ uischema: UISchemaElement; schema: JsonSchema }>();

const component = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    (props.uischema as any).options?.component as string,
  ),
);
</script>

<template>
  <component :is="component" v-if="component" />
</template>
