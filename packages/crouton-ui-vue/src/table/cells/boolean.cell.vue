<template>
  <div class="flex justify-center">
    <Icon
      v-if="value === true"
      :icon="IconEnum.Check"
      size="sm"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { TextCellProperties } from './text.cell.properties';
import { IconEnum } from '../../icons';
import Icon from '../../icons/icon.vue';

const props = defineProps(TextCellProperties);

const value = computed(() => {
  const val = props.data[props.column.id];
  if (!val) return null;

  if (props.column.options?.format === 'keyValue') {
    return val[props.column.options.key];
  }

  return val;
});
</script>
