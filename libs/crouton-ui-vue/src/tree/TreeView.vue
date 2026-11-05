<script setup lang="ts">
import { ref } from 'vue';

import TreeItem from './TreeItem.vue';
import type { TreeEmits, TreeNode, TreeProps } from './props';

const props = defineProps<TreeProps>();

const emits = defineEmits<TreeEmits>();

const expanded = ref<Set<string>>(new Set());

const toggle = (node: TreeNode) => {
  const id = node.id;
  if (!node.children || node.children.length === 0) {
    emits('select', node);
    return;
  }

  if (expanded.value.has(id)) {
    expanded.value.delete(id);
  } else {
    expanded.value.add(id);
  }
};

const select = (node: TreeNode) => {
  emits('select', node);
  expanded.value.add(node.id);
};

const isExpanded = (id: string) => expanded.value.has(id);
</script>

<template>
  <ul class="select-none text-sm">
    <TreeItem
      v-for="node in props.data"
      :key="node.id"
      :node="node"
      :expanded="expanded"
      :active="active"
      :is-expanded="isExpanded"
      @toggle="toggle"
      @select="select"
    />
  </ul>
</template>

<script lang="ts" setup></script>
