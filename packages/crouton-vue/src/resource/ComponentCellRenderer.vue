<script setup lang="ts">
import { computed } from 'vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

import type { PropType } from 'vue';

const props = defineProps({
  data: { type: Object as PropType<Record<string, unknown>>, required: true as const },
  column: { type: Object as PropType<Record<string, unknown>>, required: true as const },
});

const component = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    (props.column.options as Record<string, unknown> | undefined)?.component as string | undefined,
  ),
);
</script>

<template>
  <component :is="component" v-if="component" :data="data" :column="column" />
</template>
