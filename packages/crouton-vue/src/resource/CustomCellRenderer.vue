<script setup lang="ts">
import { computed } from 'vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

import type { PropType } from 'vue';

const props = defineProps({
  data: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  column: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  options: { type: Object as PropType<Record<string, unknown>> },
});

const customComponent = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    props.options?.customComponent as string | undefined,
  ),
);

const value = computed(() => props.data[props.column.id as string]);
</script>

<template>
  <component
    v-if="customComponent"
    :is="customComponent"
    :data="data"
    :value="value"
    :column="column"
    :options="options"
  />
</template>