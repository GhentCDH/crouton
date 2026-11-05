<template>
  <span
    v-if="displayMessage"
    class="text-sm mr-3"
    :class="messageStatusClass"
    >{{ displayMessage }}</span
  >
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import {
  MessageProps,
  MessageStatus,
  MessageStatusLabel,
} from './Message.properties';

const props = defineProps(MessageProps);

const displayMessage = computed(
  () => props.message ?? (props.status ? MessageStatusLabel[props.status] : ''),
);

const messageStatusClass = computed(() => ({
  'text-gray-400': props.status === MessageStatus.idle,
  'text-blue-500': props.status === MessageStatus.saving,
  'text-green-600': props.status === MessageStatus.saved,
  'text-amber-500': props.status === MessageStatus.pending,
  'text-red-500': props.status === MessageStatus.error,
}));
</script>
