<script setup lang="ts">
import { computed } from 'vue';

import { FormFieldCardProperties } from './FormFieldCard.properties';
import FieldOptionsMenu from './FieldOptionsMenu.vue';
import FieldPreview from './FieldPreview.vue';

const props = defineProps(FormFieldCardProperties);

const emits = defineEmits<{
  'change-type': [type: string];
  remove: [];
  select: [];
}>();

const typeLabel = computed(
  () =>
    props.typeOptions.find((o) => o.value === props.field.type)?.label ??
    props.field.type,
);
</script>

<template>
  <div
    class="card bg-base-100 border border-base-300 shadow-sm relative group cursor-pointer"
    :class="{ 'ring-2 ring-primary': selected }"
    @click="emits('select')"
  >
    <div class="flex items-start gap-1 p-2 pb-0 relative">
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium truncate">{{ field.label }}</div>
        <div class="text-[10px] uppercase tracking-wide opacity-50">
          {{ typeLabel }}
        </div>
      </div>
      <div @click.stop>
        <FieldOptionsMenu
          :type-options="typeOptions"
          :current-type="field.type"
          :remove-label="removeLabel"
          @change-type="(t) => emits('change-type', t)"
          @remove="emits('remove')"
        />
      </div>
    </div>

    <div class="p-2 pt-1">
      <FieldPreview
        :type="field.type"
        :value="field.label"
        :select-options="selectOptions"
      />
    </div>

  </div>
</template>