<template>
  <div
    role="alert"
    :class="`alert ${Colors[type]} `"
  >
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import type { NotificationType } from './notification-message.ts';

defineProps<{
  message: string;
  type: NotificationType;
}>();

const Colors: Record<NotificationType, string> = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};
</script>
