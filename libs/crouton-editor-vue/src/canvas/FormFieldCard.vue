<script setup lang="ts">
import { computed } from 'vue';

import { FormFieldCardProperties } from './FormFieldCard.properties';
import FieldOptionsMenu from './FieldOptionsMenu.vue';
import FieldPreview from './FieldPreview.vue';
import { useColspanResize } from './useColspanResize';

const props = defineProps(FormFieldCardProperties);

const emits = defineEmits<{
  'update:colspan': [colspan: number];
  'change-type': [type: string];
  remove: [];
  select: [];
}>();

const { resizing, start: startResize } = useColspanResize(
  () => props.field.colspan,
  (n) => emits('update:colspan', n),
);

const typeLabel = computed(
  () =>
    props.typeOptions.find((o) => o.value === props.field.type)?.label ??
    props.field.type,
);
</script>

<template>
  <div
    class="card bg-base-100 border border-base-300 shadow-sm relative group cursor-pointer"
    :class="{ 'ring-2 ring-primary': resizing || selected }"
    @click="emits('select')"
  >
    <!--
      relative z-10: the absolutely-positioned resize handle below (top-0
      right-0 h-full) paints above static content by default regardless of
      DOM order, so without this the "..." menu button — which sits at the
      card's right edge, right where the resize strip is — silently ate
      every click meant for it. Lifting the header into its own stacked
      layer above the handle fixes that without shrinking the handle's
      grabbable area.
    -->
    <div class="flex items-start gap-1 p-2 pb-0 relative">
      <span
        class="drag-handle cursor-grab active:cursor-grabbing select-none px-1 text-base-content/40 hover:text-base-content/70"
        title="Drag to reorder"
        @click.stop
      >
        ⠿
      </span>
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

    <!-- Resize handle: drag the trailing edge to change colspan (1–12). -->
    <div
      class="absolute top-0 right-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-primary/30"
      title="Drag to resize"
      @click.stop
      @pointerdown="startResize($event, gridEl)"
    />
  </div>
</template>