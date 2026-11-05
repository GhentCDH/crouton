<script setup lang="ts">
import { computed } from 'vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

const props = defineProps({
  data: { type: Object, required: true },
  column: { type: Object, required: true },
  options: { type: Object },
});

const customComponent = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    props.options?.customComponent as string,
  ),
);

const value = computed(() => props.data[props.column.id]);
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