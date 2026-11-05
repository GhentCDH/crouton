<template>
  <div
    v-if="loading"
    role="status"
    aria-live="polite"
    class="flex items-center justify-center h-20"
  >
    <span
      aria-hidden="true"
      class="loading loading-bars loading-md text-primary"
    />
    <span class="sr-only">Loading...</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean;
}>();
</script>
