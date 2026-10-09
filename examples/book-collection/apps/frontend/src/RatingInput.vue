<template>
  <div class="flex gap-1">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      @click="emit('update:modelValue', star)"
      :class="star <= (modelValue ?? 0) ? 'text-yellow-400' : 'text-gray-300'"
      style="font-size: 1.5rem; background: none; border: none; cursor: pointer;"
    >
      ★
    </button>
  </div>
</template>

<script lang="ts" setup>
import { RatingInputProperties } from './RatingInput.properties.js';

const props = defineProps(RatingInputProperties);
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
</script>
