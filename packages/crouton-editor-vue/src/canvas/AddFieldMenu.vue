<script setup lang="ts">
import { Btn } from '@ghentcdh/ui';

import { AddFieldMenuProperties } from './AddFieldMenu.properties';

defineProps(AddFieldMenuProperties);

const emits = defineEmits<{
  add: [fieldId: string];
}>();
</script>

<template>
  <div class="dropdown">
    <Btn
      tabindex="0"
      color="secondary"
      :outline="true"
      size="sm"
      :disabled="disabled"
    >
      + Add field
    </Btn>

    <ul
      tabindex="0"
      class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-md border border-base-300 z-10 w-56 p-1"
    >
      <li v-for="hidden in hiddenFields" :key="hidden.id">
        <a @click="emits('add', hidden.id)">{{ hidden.label }}</a>
      </li>
    </ul>
  </div>
</template>