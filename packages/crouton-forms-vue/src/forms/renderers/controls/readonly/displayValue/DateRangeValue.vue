<template>
  <p>
    <small class="text-gray-500">{{ options.fromLabel ?? 'From' }}: </small>
    {{ from }} <br />
    <small class="text-gray-500">{{ options.toLabel ?? 'To' }}: </small>
    {{ to }}
  </p>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';

const { options, value } = defineProps({
  options: { type: Object, required: true as const },
  value: { type: Object as PropType<unknown>, required: true as const },
});

const from = computed(() => {
  return value?.[options.fromField ?? 'from'];
});
const to = computed(() => {
  return value?.[options.toField ?? 'to'];
});
</script>
