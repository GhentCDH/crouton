<script setup lang="ts">
import { computed } from 'vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

const props = defineProps({
  data: { type: Object, required: true as const },
  column: { type: Object, required: true as const },
});

const component = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    props.column.options?.component as string,
  ),
);
</script>

<template>
  <component :is="component" v-if="component" :data="data" :column="column" />
</template>
