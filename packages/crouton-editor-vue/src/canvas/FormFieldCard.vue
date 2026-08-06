<script setup lang="ts">
import { computed, ref } from 'vue';

import {
  Btn,
  Checkbox,
  Input,
  InputNumber,
  MultiSelect,
  SelectComponent,
  Textarea,
} from '@ghentcdh/ui';

import { FormFieldCardProperties } from './FormFieldCard.properties';
import { useColspanResize } from './useColspanResize';

const props = defineProps(FormFieldCardProperties);

const emits = defineEmits<{
  'update:colspan': [colspan: number];
  'change-type': [type: string];
  remove: [];
}>();

const { resizing, start: startResize } = useColspanResize(
  () => props.field.colspan,
  (n) => emits('update:colspan', n),
);

// Purely decorative: gives every control something visible to render without
// implying any of this is real, saved data — nothing here is read by the
// output builder. A fresh value per field, seeded from its type/label so the
// canvas doesn't render a wall of identical empty inputs.
const previewValue = ref<unknown>(
  (() => {
    switch (props.field.type) {
      case 'number':
      case 'Integer':
        return 0;
      case 'boolean':
        return false;
      case 'mutliSelect':
        return [];
      case 'select':
        return props.selectOptions[0]?.value ?? '';
      default:
        return props.field.label;
    }
  })(),
);

const menuOpen = ref(false);

const onSelectType = (type: string) => {
  menuOpen.value = false;
  emits('change-type', type);
};

const onRemove = () => {
  menuOpen.value = false;
  emits('remove');
};

const typeLabel = computed(
  () =>
    props.typeOptions.find((o) => o.value === props.field.type)?.label ??
    props.field.type,
);
</script>

<template>
  <div
    class="card bg-base-100 border border-base-300 shadow-sm relative group"
    :class="{ 'ring-2 ring-primary': resizing }"
  >
    <div class="flex items-start gap-1 p-2 pb-0">
      <span
        class="drag-handle cursor-grab active:cursor-grabbing select-none px-1 text-base-content/40 hover:text-base-content/70"
        title="Drag to reorder"
      >
        ⠿
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium truncate">{{ field.label }}</div>
        <div class="text-[10px] uppercase tracking-wide opacity-50">
          {{ typeLabel }}
        </div>
      </div>
      <div class="dropdown dropdown-end">
        <Btn
          tabindex="0"
          color="secondary"
          :outline="true"
          size="xs"
          title="Field options"
          @click="menuOpen = !menuOpen"
        >
          ⋯
        </Btn>
        <ul
          v-if="menuOpen"
          tabindex="0"
          class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-md border border-base-300 z-10 w-48 p-1"
        >
          <li v-if="typeOptions.length" class="menu-title text-[10px]">
            Change display type
          </li>
          <li v-for="opt in typeOptions" :key="opt.value">
            <a
              :class="{ 'font-semibold': opt.value === field.type }"
              @click="onSelectType(opt.value)"
            >
              {{ opt.label }}
            </a>
          </li>
          <li v-if="typeOptions.length"><hr class="my-1" /></li>
          <li>
            <a class="text-error" @click="onRemove">Remove from form</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="p-2 pt-1">
      <Input
        v-if="field.type === 'string'"
        v-model="previewValue as string"
        size="sm"
        :enabled="false"
      />
      <Textarea
        v-else-if="field.type === 'textarea' || field.type === 'markdown'"
        v-model="previewValue as string"
        size="sm"
        :rows="field.type === 'markdown' ? 4 : 3"
        :enabled="false"
      />
      <InputNumber
        v-else-if="field.type === 'number' || field.type === 'Integer'"
        v-model="previewValue as number"
        size="sm"
        :enabled="false"
      />
      <Checkbox
        v-else-if="field.type === 'boolean'"
        v-model="previewValue as boolean"
        :enabled="false"
      />
      <SelectComponent
        v-else-if="field.type === 'select'"
        size="sm"
        :value="previewValue"
        :options="
          selectOptions.length
            ? selectOptions
            : [
                { label: 'Option A', value: 'a' },
                { label: 'Option B', value: 'b' },
              ]
        "
        :clearable="false"
        :enabled="false"
      />
      <MultiSelect
        v-else-if="field.type === 'mutliSelect'"
        v-model="previewValue as unknown[]"
        size="sm"
        :options="
          selectOptions.length
            ? selectOptions
            : [
                { label: 'Option A', value: 'a' },
                { label: 'Option B', value: 'b' },
              ]
        "
        :enabled="false"
      />
    </div>

    <!-- Resize handle: drag the trailing edge to change colspan (1–12). -->
    <div
      class="absolute top-0 right-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30"
      title="Drag to resize"
      @pointerdown="startResize($event, gridEl)"
    />
  </div>
</template>
