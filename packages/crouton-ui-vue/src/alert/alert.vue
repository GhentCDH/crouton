<template>
  <div
    role="alert"
    :class="`alert alert-soft ${Colors[type]} `"
  >
    <span class="text-gray-800">{{ message }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { AlertType } from './alert.model.ts';

defineProps<{
  message: string;
  type: AlertType;
}>();

const Colors: Record<AlertType, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};
</script>
