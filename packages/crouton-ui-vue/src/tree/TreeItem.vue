<script setup lang="ts">
import { computed } from 'vue';

import type { TreeNode } from './props';

const props = defineProps<{
  active?: string;
  node: TreeNode;
  expanded: Set<string>;
  isExpanded: (id: string) => boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle', node: TreeNode): void;
  (e: 'select', node: TreeNode): void;
}>();

const isActive = computed(() => props.active === props.node.id);
</script>

<template>
  <li class="ml-1">
    <div
      :class="[
        `flex items-center gap-1 cursor-pointer rounded-md px-1 py-0.5
      hover:bg-gray-100`,
        isActive ? 'text-primary' : '',
      ]"
    >
      <span
        v-if="(node?.children?.length ?? 0) > 0"
        class="flex items-center justify-center"
        @click="emit('toggle', node)"
      >
        <!-- chevron-down (solid) -->
        <svg
          v-if="node.children && isExpanded(node.id)"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          class="w-3 h-3"
        >
          <path
            fill-rule="evenodd"
            d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
            clip-rule="evenodd"
          />
        </svg>
        <!-- chevron-right (solid) -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          class="w-3 h-3"
        >
          <path
            fill-rule="evenodd"
            d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
            clip-rule="evenodd"
          />
        </svg>
      </span>

      <div
        class="flex items-center gap-2 w-full min-w-0"
        @click="emit('select', node)"
      >
        <div class="truncate flex-1 min-w-0 text-left">
          {{ node.label }}
        </div>
        <div
          v-if="node.tag"
          class="badge badge-ghost badge-sm flex-shrink-0"
        >
          {{ node.tag }}
        </div>
      </div>
    </div>

    <ul
      v-if="node.children && isExpanded(node.id)"
      :class="[
        `ml-4 border-l pl-2`,
        { 'border-gray-200': !isActive, 'border-primary': isActive },
      ]"
    >
      <TreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded="expanded"
        :active="active"
        :is-expanded="isExpanded"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
      />
    </ul>
  </li>
</template>
