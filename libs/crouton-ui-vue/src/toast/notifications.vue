<template>
  <div class="toast toast-top toast-center z-[999]">
    <NotificationMessage
      v-for="notification of store.notifications.value"
      :key="notification.id"
      v-bind="notification"
    />
  </div>
</template>

<script setup lang="ts">
import NotificationMessage from './notification-message.vue'
import { NotificationService } from './notification.service';

const store = NotificationService.getInstance();
</script>
