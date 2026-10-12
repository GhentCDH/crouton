<template>
  <component :is="userComponent" :data="data" :column="column" />
</template>

<script setup lang="ts">
const props = defineProps({
  data: { type: Object, required: true as const },
  column: { type: Object, required: true as const },
});

const userComponent = props.column.options?.component as string;
</script>
