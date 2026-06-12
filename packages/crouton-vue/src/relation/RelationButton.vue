<template>
  <Btn
    color="ghost"
    class="border-gray-300 text-primary h-8 max-w-full overflow-hidden [&>span]:flex [&>span]:min-w-0"
    style="max-width: 200px"
    :tooltip="labelValue"
  >
    <span class="pl-2 flex items-center min-w-0 overflow-hidden">
      <div class="flex gap-2 items-center font-medium" @click="view">
        <div class="truncate flex-grow text-gray-700">
          {{ labelValue }}
          <small v-if="description" class="text-gray-500">
            {{ description }}
          </small>
        </div>
        <Icon
          :icon="IconEnum.View"
          size="sm"
          class="shrink-0"
          v-if="!hasEdit"
        />
        <Icon :icon="IconEnum.Edit" size="sm" class="shrink-0" v-if="hasEdit" />
      </div>
      <div
        class="hover:bg-gray-100 py-2 px-1"
        @click="deleteFn($event)"
        v-if="hasDelete"
      >
        <Icon :icon="IconEnum.Delete" size="sm" class="shrink-0" />
      </div>
    </span>
  </Btn>
</template>

<script setup lang="ts">
import { Btn, Icon, IconEnum } from '@ghentcdh/ui';
import { computed, PropType, useAttrs } from 'vue';

const props = defineProps({
  options: {
    type: Object as PropType<{ descriptionKey?: string; displayKey: string }>,
    required: true as const,
  },
  value: { type: Object as PropType<unknown>, required: true as const },
});

const getNestedValue = (path: string): unknown => {
  const value = props.value;
  return path.split('.').reduce<unknown>((obj, key) => {
    return obj != null && typeof obj === 'object'
      ? (obj as Record<string, unknown>)[key]
      : undefined;
  }, value);
};

type RelationHandlers = {
  onView?: (value: unknown) => void;
  onEdit?: (value: unknown) => void;
  onDelete?: (value: unknown) => void;
};
const attrs = useAttrs() as RelationHandlers;
const hasView = computed(() => 'onView' in attrs);
const hasEdit = computed(() => 'onEdit' in attrs);
const hasDelete = computed(() => 'onDelete' in attrs);
const labelValue = computed(() => {
  const displayKey = props.options.displayKey ?? 'id';

  return getNestedValue(displayKey) as string;
});

const description = computed(() => {
  const descriptionKey = props.options.descriptionKey;

  if (!descriptionKey) return null;
  return getNestedValue(descriptionKey);
});

const view = () => {
  if (hasEdit.value) return attrs.onEdit?.(props.value);
  if (hasView.value) return attrs.onView?.(props.value);
};

const deleteFn = (event: MouseEvent) => {
  event.preventDefault();
  if (!hasDelete.value) return;

  return attrs.onDelete?.(props.value);
};
</script>
