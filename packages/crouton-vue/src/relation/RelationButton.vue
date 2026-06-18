<template>
  <Btn
    color="ghost"
    class="border-gray-300 text-primary max-w-full overflow-hidden [&>span]:flex [&>span]:min-w-0 !p-0"
    style="max-width: 200px"
    :tooltip="labelValue"
  >
    <div class="flex items-center min-w-0 min-h-8">
      <div
        class="pl-2 flex flex-1 min-w-0 gap-2 items-center font-medium"
        :class="{ 'pr-2': !showIcon }"
        @click="view"
      >
        <div class="truncate min-w-0 text-gray-700">
          {{ labelValue }}
          <small v-if="description" class="text-gray-500">
            {{ description }}
          </small>
        </div>
        <Icon
          :icon="IconEnum.View"
          size="sm"
          class="shrink-0"
          v-if="!hasEdit && showIcon"
        />
        <Icon :icon="IconEnum.Edit" size="sm" class="shrink-0" v-if="hasEdit" />
      </div>
      <div
        class="shrink-0 hover:bg-gray-100 py-2 px-1"
        @click="deleteFn($event)"
        v-if="hasDelete"
      >
        <Icon :icon="IconEnum.Delete" size="sm" class="shrink-0" />
      </div>
    </div>
  </Btn>
</template>

<script setup lang="ts">
import { Btn, Icon, IconEnum } from '@ghentcdh/ui';
import { computed, PropType, useAttrs } from 'vue';

const props = defineProps({
  showIcon: { type: Boolean, default: true },
  options: {
    type: Object as PropType<{ descriptionKey?: string; displayKey?: string }>,
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
