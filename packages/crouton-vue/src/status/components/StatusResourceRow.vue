<template>
  <div
    :id="`resource-${props.resource.name}`"
    class="rounded-lg border overflow-hidden"
    :class="stateClasses[state].border"
  >
    <!-- collapsed header -->
    <button
      class="w-full flex items-center gap-3 p-3 hover:bg-base-200 transition-colors text-left"
      @click="emit('toggle')"
    >
      <span
        class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
        :class="stateClasses[state].dot"
      />
      <span class="font-medium text-base-content flex-1 truncate">{{
        props.resource.name
      }}</span>
      <span
        class="text-xs px-2 py-0.5 rounded"
        :class="stateClasses[state].badge"
      >
        {{ state }}
      </span>
      <span
        v-if="props.resource.version != null"
        class="text-xs font-mono text-base-content/60"
      >
        v{{ props.resource.version }}
      </span>
      <svg
        class="w-4 h-4 text-base-content/60 shrink-0 transition-transform"
        :class="props.expanded ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- expanded body -->
    <div
      v-if="props.expanded"
      class="border-t border-base-300 p-3 space-y-3 bg-base-100 text-sm"
    >
      <div
        class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-base-content/70"
      >
        <span>Path</span
        ><span class="font-mono text-base-content">{{
          props.resource.path
        }}</span>
        <span v-if="props.resource.kind">Kind</span
        ><span v-if="props.resource.kind">{{ props.resource.kind }}</span>
        <span v-if="props.resource.version != null">Version</span>
        <span v-if="props.resource.version != null">
          v{{ props.resource.version }}
          <span
            v-if="
              props.resource.expectedVersion != null &&
              props.resource.expectedVersion !== props.resource.version
            "
          >
            → v{{ props.resource.expectedVersion }}
          </span>
        </span>
        <template v-if="props.resource.customOperations?.length">
          <span>Custom ops</span>
          <span>{{ props.resource.customOperations.join(', ') }}</span>
        </template>
      </div>

      <div v-if="props.resource.error">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-error">Error</span>
          <button
            class="text-xs text-primary hover:underline"
            @click="copyError"
          >
            copy
          </button>
        </div>
        <pre
          class="bg-base-200 rounded p-2 text-xs font-mono text-error overflow-x-auto whitespace-pre-wrap break-all"
          >{{ props.resource.error }}</pre>
      </div>

      <ul v-if="props.resource.warnings?.length" class="space-y-1">
        <li
          v-for="w in props.resource.warnings"
          :key="w"
          class="text-xs text-warning"
        >
          ▲ {{ w }}
        </li>
      </ul>

      <StatusResourceDemo :resource="props.resource" />

      <div v-if="props.isDev" class="flex gap-2 flex-wrap pt-1">
        <button
          v-if="props.resource.draft"
          class="rounded bg-primary px-2 py-1 text-xs text-primary-content hover:opacity-90 disabled:opacity-50"
          :disabled="props.actionLoading === props.resource.name"
          @click="emit('publish', props.resource.name)"
        >
          {{ props.actionLoading === props.resource.name ? '…' : 'Publish' }}
        </button>
        <button
          v-if="props.resource.hidden || props.resource.draft"
          class="rounded bg-success px-2 py-1 text-xs text-success-content hover:opacity-90 disabled:opacity-50"
          :disabled="props.actionLoading === props.resource.name"
          @click="emit('add-to-menu', props.resource.name)"
        >
          {{
            props.actionLoading === props.resource.name ? '…' : 'Add to menu'
          }}
        </button>
        <button
          v-if="
            props.resource.valid &&
            !props.resource.draft &&
            !props.resource.hidden
          "
          class="rounded bg-neutral px-2 py-1 text-xs text-neutral-content hover:opacity-90 disabled:opacity-50"
          :disabled="props.actionLoading === props.resource.name"
          @click="emit('remove-from-menu', props.resource.name)"
        >
          {{
            props.actionLoading === props.resource.name
              ? '…'
              : 'Remove from menu'
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { resourceState, stateClasses } from '../status.utils';
import { StatusResourceRowProperties } from './StatusResourceRow.properties';
import StatusResourceDemo from './StatusResourceDemo.vue';

const props = defineProps(StatusResourceRowProperties);
const emit = defineEmits<{
  toggle: [];
  publish: [name: string];
  'add-to-menu': [name: string];
  'remove-from-menu': [name: string];
}>();

const state = computed(() => resourceState(props.resource));

const copyError = () => {
  if (props.resource.error) navigator.clipboard.writeText(props.resource.error);
};
</script>
