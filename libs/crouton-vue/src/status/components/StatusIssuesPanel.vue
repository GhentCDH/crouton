<template>
  <div v-if="props.issues.length === 0" class="rounded-lg border border-success/40 bg-success/5 p-4 flex items-center gap-2">
    <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
    <span class="font-semibold text-success">All good</span>
  </div>
  <div v-else class="rounded-lg border border-base-300 divide-y divide-base-300 overflow-hidden">
    <div
      v-for="issue in props.issues"
      :key="`${issue.source}-${issue.target}-${issue.message}`"
      class="flex items-start gap-3 p-3 hover:bg-base-200 transition-colors"
    >
      <!-- severity icon -->
      <svg
        v-if="issue.severity === 'error'"
        class="w-4 h-4 text-error mt-0.5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M6 18L18 6M6 6l12 12" />
      </svg>
      <svg
        v-else-if="issue.severity === 'warning'"
        class="w-4 h-4 text-warning mt-0.5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <svg
        v-else
        class="w-4 h-4 text-info mt-0.5 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <div class="flex-1 min-w-0 text-sm">
        <span class="rounded bg-base-200 px-1.5 py-0.5 text-xs font-mono mr-1">{{ issue.source }}</span>
        <span class="font-medium mr-1">{{ issue.target }}</span>
        <span class="text-base-content/70">{{ issue.message }}</span>
      </div>

      <a
        :href="`#${issue.anchor}`"
        class="text-primary text-xs shrink-0 hover:underline"
        @click="emit('anchor-click', issue.anchor)"
      >→</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { StatusIssuesPanelProperties } from './StatusIssuesPanel.properties';

const props = defineProps(StatusIssuesPanelProperties);
const emit = defineEmits<{
  'anchor-click': [anchor: string];
}>();
</script>
