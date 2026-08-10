<script setup lang="ts">
import { Btn } from '@ghentcdh/ui';

import { FieldOptionsMenuProperties } from './FieldOptionsMenu.properties';

defineProps(FieldOptionsMenuProperties);

const emits = defineEmits<{
  'change-type': [type: string];
  remove: [];
}>();
</script>

<template>
  <div class="dropdown dropdown-end">
    <Btn
      tabindex="0"
      color="secondary"
      :outline="true"
      size="xs"
      title="Field options"
    >
      ⋯
    </Btn>
    <ul
      tabindex="0"
      class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-md border border-base-300 w-48 p-1"
    >
      <li v-if="typeOptions.length" class="menu-title text-[10px]">
        Change display type
      </li>
      <li v-for="opt in typeOptions" :key="opt.value">
        <a
          :class="{ 'font-semibold': opt.value === currentType }"
          @click="emits('change-type', opt.value)"
        >
          {{ opt.label }}
        </a>
      </li>
      <li v-if="typeOptions.length"><hr class="my-1" /></li>
      <li>
        <a class="text-error" @click="emits('remove')">{{ removeLabel }}</a>
      </li>
    </ul>
  </div>
</template>